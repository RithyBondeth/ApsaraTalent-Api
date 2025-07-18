import { Injectable } from '@nestjs/common';
import { BuildResumeDTO } from '../dtos/resume-builder.dto';
import OpenAI from 'openai';
import * as puppeteer from 'puppeteer';
import { ConfigService } from '@nestjs/config';
import { ImageService } from './image.service';
import { PinoLogger } from 'nestjs-pino';

@Injectable()
export class ResumeBuilderService {
  private readonly logger: PinoLogger;
  private openAI: OpenAI;

  constructor(
    private readonly configService: ConfigService,
    private readonly imageService: ImageService,
  ) {
    // Initialize openAI
    this.openAI = new OpenAI({
      apiKey: this.configService.get<string>('OPENAI_API_KEY'),
    });
  }

  async buildResume(buildResumeDTO: BuildResumeDTO): Promise<any> {
    try {
        // Process profile picture if provided
        if(buildResumeDTO.personalInfo.profilePicture) {
          buildResumeDTO.personalInfo.profilePicture = await this.imageService.optimizeProfilePicture(
            buildResumeDTO.personalInfo.profilePicture
          );
        } 

        // Generate resume content using OpenAI
        const htmlContent = await this.generateHTMLContent(buildResumeDTO);

        //Convert to PDF
        return await this.pdfGenerator(htmlContent);
    } catch (error) {
      this.logger.error(`Resume generation failed: ${error.message}`);
      throw new Error(error.message);
    }
  }

  private async generateHTMLContent(buildResumeDTO: BuildResumeDTO): Promise<string> {
      const completion = await this.openAI.chat.completions.create({
        model: 'gpt-3.5-turbo',
        temperature: 0.7,
        messages: [
          {
            role: "system",
            content: `You are an expert resume designer. Create a modern, professional HTML resume with embedded CSS.
            The resume should include a profile picture (if provided), be visually appealing, and optimized for PDF conversion.
            Use a clean, modern design with appropriate spacing and typography.
            Include proper semantic HTML and responsive design principles.
            Return only the complete HTML document with embedded CSS.`
          },
          {
            role: "user",
            content: this.createPrompt(buildResumeDTO)
          }
        ],
      });

      return completion.choices[0].message.content;
  }
  
  private createPrompt(buildResumeDTO: BuildResumeDTO): string {
    return `Create a professional resume with this information:

      Personal Information:
      - Name: ${buildResumeDTO.personalInfo.fullName}
      - Email: ${buildResumeDTO.personalInfo.email}
      - Phone: ${buildResumeDTO.personalInfo.phone || 'N/A'}
      - Location: ${buildResumeDTO.personalInfo.location || 'N/A'}
      - LinkedIn: ${buildResumeDTO.personalInfo.linkedin || 'N/A'}
      ${buildResumeDTO.personalInfo.profilePicture ? `- Profile Picture: ${buildResumeDTO.personalInfo.profilePicture}` : ''}

      Experience:
      ${buildResumeDTO.experience.map(exp => `
      - Company: ${exp.company}
        Position: ${exp.position}
        Duration: ${exp.startDate} - ${exp.endDate || 'Present'}
        Description: ${exp.description}
        Achievements: ${exp.achievements.map(achievement => `  - ${achievement}`).join('\n')}`).join('\n')
      }

      Skills:
      ${buildResumeDTO.skills.join(', ')}

      ${buildResumeDTO.education ? `Education: ${buildResumeDTO.education}` : ''}

      Requirements:
      1. Use a modern, clean design
      2. Include a circular profile picture frame
      3. Use professional fonts and colors
      4. Create proper spacing and layout
      5. Optimize for PDF output
      6. Include subtle animations or hover effects
      7. Use semantic HTML structure`;
  }

  async pdfGenerator(html: string): Promise<Buffer> {
    const browser = await puppeteer.launch({ 
      headless: true,
      args: ['--no-sandbox']
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
