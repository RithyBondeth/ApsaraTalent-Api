import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RpcException } from '@nestjs/microservices';
import { PinoLogger } from 'nestjs-pino';
import OpenAI from 'openai';
import {
  BuildResumeDTO,
  BuildResumeResponseDTO,
} from '@app/contracts/dtos/resume';
import { ImageService } from './image.service';
import { IResumeBuilderService } from '@app/contracts/interfaces/service/resume-builder-service.interface';
import { buildResumeSystemPrompt } from '../utils/resume-prompt.util';
import { generatePdf } from '../utils/pdf-generator.util';

@Injectable()
export class ResumeBuilderService implements IResumeBuilderService {
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

  async buildResume(
    buildResumeDTO: BuildResumeDTO,
  ): Promise<BuildResumeResponseDTO> {
    try {
      if (buildResumeDTO.personalInfo.profilePicture) {
        buildResumeDTO.personalInfo.profilePicture =
          await this.imageService.optimizeProfilePicture(
            buildResumeDTO.personalInfo.profilePicture,
          );
      }

      const htmlContent = await this.generateHTMLContent(buildResumeDTO);
      const pdfBuffer = await generatePdf(htmlContent);

      return new BuildResumeResponseDTO({
        filename: 'resume.pdf',
        mimeType: 'application/pdf',
        data: pdfBuffer.toString('base64'),
      });
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
      const systemPrompt = buildResumeSystemPrompt(buildResumeDTO.template);

      // Strip base64 avatar before sending to GPT to avoid burning the token budget.
      // We swap it back in after generation using a sentinel token.
      const AVATAR_TOKEN = '__AVATAR_BASE64__';
      const avatarBase64 =
        buildResumeDTO.personalInfo?.profilePicture?.startsWith('data:')
          ? buildResumeDTO.personalInfo.profilePicture
          : null;

      const dtoForGPT = avatarBase64
        ? {
            ...buildResumeDTO,
            personalInfo: {
              ...buildResumeDTO.personalInfo,
              profilePicture: AVATAR_TOKEN,
            },
          }
        : buildResumeDTO;

      const completion = await this.openAI.chat.completions.create({
        model: 'gpt-4o',
        temperature: 0.3,
        max_tokens: 4096,
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: `Generate the resume HTML for this candidate data:\n\n${JSON.stringify(dtoForGPT, null, 2)}`,
          },
        ],
      });

      const content = completion.choices?.[0]?.message?.content;
      if (!content || !content.toLowerCase().includes('<html')) {
        throw new Error('OpenAI did not return valid HTML');
      }

      let cleanedHTML = content
        .replace(/^```html\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/```\s*$/i, '')
        .trim();

      if (avatarBase64) {
        cleanedHTML = cleanedHTML.split(AVATAR_TOKEN).join(avatarBase64);
      }

      return cleanedHTML;
    } catch (error) {
      this.logger.error(
        { err: error },
        'Error generating resume content with OpenAI',
      );
      throw new Error('Failed to generate resume content');
    }
  }
}
