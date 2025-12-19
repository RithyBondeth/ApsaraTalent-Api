import { Injectable } from '@nestjs/common';
import { BuildResumeDTO } from '../dtos/resume-builder.dto';
import OpenAI from 'openai';
import * as puppeteer from 'puppeteer';
import { ConfigService } from '@nestjs/config';
import { ImageService } from './image.service';
import { PinoLogger } from 'nestjs-pino';
import { RpcException } from '@nestjs/microservices';

@Injectable()
export class ResumeBuilderService {
  private openAI: OpenAI;

  constructor(
    private readonly configService: ConfigService,
    private readonly imageService: ImageService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(ResumeBuilderService.name);
    this.openAI = new OpenAI({
      apiKey: this.configService.get<string>('openai.apiKey'),
    });
  }

  async buildResume(buildResumeDTO: BuildResumeDTO): Promise<any> {
    try {
      if (buildResumeDTO.personalInfo.profilePicture) {
        buildResumeDTO.personalInfo.profilePicture =
          await this.imageService.optimizeProfilePicture(
            buildResumeDTO.personalInfo.profilePicture,
          );
      }

      const htmlContent = await this.generateHTMLContent(buildResumeDTO);
      const pdfBuffer = await this.pdfGenerator(htmlContent);

      return {
        filename: 'resume.pdf',
        mimeType: 'application/pdf',
        data: pdfBuffer.toString('base64'),
      };
    } catch (error) {
      this.logger.error({ err: error }, 'Resume generation failed');
      throw new RpcException(
        error instanceof Error ? error.message : 'Resume generation failed',
      );
    }
  }

  private async generateHTMLContent(
    buildResumeDTO: BuildResumeDTO,
  ): Promise<string> {
    try {
      // Map custom keywords to core layout styles
      const templateMap: Record<string, string> = {
        modern:
          'Clean layout with sans-serif fonts, color highlights, two-column design',
        classic:
          'Formal layout with serif fonts, black and white, structured sections',
        creative:
          'Colorful design with asymmetric layout, bold icons, and playful fonts',
        minimalist: 'Very clean layout with whitespace and typography emphasis',
        timeline: 'Vertical timeline style for experience and education',
        bold: 'High-contrast colors, large headings, confident layout',
        compact: 'Single-column layout, tight spacing, minimal decoration',
        elegant: 'Slim fonts, soft colors, premium-feel layout',
        colorful: 'Vibrant color blocks, iconography, modern look',
        professional: 'Conservative, polished, job-market ready layout',
        corporate: 'Blue theme, rigid grid, clean branding, executive style',
        dark: 'Dark background, light text, modern UI style',
      };

      const templateStyle =
        templateMap[buildResumeDTO.template] ?? templateMap['modern'];

      const completion = await this.openAI.chat.completions.create({
        model: 'gpt-4o',
        temperature: 0.7,
        messages: [
          {
            role: 'system',
            content: `
              You are a professional resume designer and frontend developer.

              Generate a complete HTML5 resume layout using embedded CSS that reflects the following style:
              "${templateStyle}"

              Requirements:
              - Use semantic HTML tags: <html>, <head>, <body>, <header>, <section>, etc.
              - Embed all styles using <style> in <head>
              - Use clean, readable fonts and responsive layout
              - Profile picture should appear circular (if provided)
              - Include: Personal Info, Contact, Social Links, Work Experience, Skills, Education
              - Optimize layout and spacing for PDF (A4 size)
              - Return only valid HTML (no Markdown, no backticks)
              `.trim(),
          },
          {
            role: 'user',
            content: JSON.stringify(buildResumeDTO, null, 2),
          },
        ],
      });

      const content = completion.choices?.[0]?.message?.content;
      if (!content || !content.includes('<html')) {
        throw new Error('OpenAI did not return valid HTML');
      }

      const cleanedHTML = content
        .replace(/^```html\s*/i, '')
        .replace(/```$/, '')
        .trim();

      return cleanedHTML;
    } catch (error) {
      this.logger.error(
        { err: error },
        'Error generating resume content with OpenAI',
      );
      throw new Error('Failed to generate resume content');
    }
  }

  private async pdfGenerator(html: string): Promise<Buffer> {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox'],
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });

    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20px',
        right: '20px',
        bottom: '20px',
        left: '20px',
      },
      displayHeaderFooter: true,
      headerTemplate: '<div></div>',
      footerTemplate: `<div style="font-size: 8px; text-align: center; width: 100%;">
        Generated on ${new Date().toLocaleDateString()}
      </div>`,
    });

    await browser.close();
    return Buffer.from(pdf);
  }
}
