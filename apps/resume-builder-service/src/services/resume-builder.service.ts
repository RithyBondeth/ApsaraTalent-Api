import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RpcException } from '@nestjs/microservices';
import { PinoLogger } from 'nestjs-pino';
import OpenAI from 'openai';
import {
  BuildResumeDTO,
  BuildResumeResponseDTO,
  GenerateCoverLetterDTO,
  GenerateCoverLetterResponseDTO,
  PolishCoverLetterDTO,
  PolishCoverLetterResponseDTO,
  GenerateCoverLetterPdfDTO,
  GenerateCoverLetterPdfResponseDTO,
  GenerateInterviewPrepPdfDTO,
  GenerateInterviewPrepPdfResponseDTO,
  OptimizeResumeDTO,
  OptimizeResumeResponseDTO,
} from '@app/contracts/dtos/resume';
import { ImageService } from './image.service';
import { IResumeBuilderService } from '@app/contracts/interfaces/service/resume-builder-service.interface';
import { buildResumeSystemPrompt } from '../utils/resume-prompt.util';
import { generatePdf } from '../utils/pdf-generator.util';
import { buildCoverLetterHtml } from '../utils/cover-letter-templates.util';
import { buildInterviewPrepHtml } from '../utils/interview-prep-template.util';

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

  async optimizeResume(
    optimizeResumeDTO: OptimizeResumeDTO,
  ): Promise<OptimizeResumeResponseDTO> {
    try {
      const model = this.configService.get<string>('openai.model') ?? 'gpt-4o';
      const resumeData = { ...optimizeResumeDTO };
      if (resumeData.personalInfo?.profilePicture?.startsWith('data:')) {
        resumeData.personalInfo = {
          ...resumeData.personalInfo,
          profilePicture: undefined,
        };
      }

      const completion = await this.openAI.chat.completions.create({
        model,
        temperature: 0.4,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: `You are a professional resume coach. Analyze the candidate's resume and return a JSON object with exactly these fields:
- "overallFeedback": (string) 2-3 sentence overall assessment
- "suggestedSummary": (string) an improved professional summary
- "experienceSuggestions": (array) each item has { "index": number, "improvedDescription": string, "improvedAchievements": string[] }
- "suggestedSkills": (string[]) up to 6 additional relevant skills to add based on experience
Return valid JSON only.`,
          },
          {
            role: 'user',
            content: `Optimize this resume:\n\n${JSON.stringify(resumeData, null, 2)}`,
          },
        ],
      });

      const raw = completion.choices?.[0]?.message?.content ?? '{}';
      const parsed = JSON.parse(raw);
      return new OptimizeResumeResponseDTO({
        overallFeedback: parsed.overallFeedback ?? '',
        suggestedSummary: parsed.suggestedSummary ?? '',
        experienceSuggestions: parsed.experienceSuggestions ?? [],
        suggestedSkills: parsed.suggestedSkills ?? [],
      });
    } catch (error) {
      this.logger.error({ err: error }, 'Resume optimization failed');
      throw new RpcException(
        error instanceof Error ? error.message : 'Resume optimization failed',
      );
    }
  }

  async generateCoverLetter(
    generateCoverLetterDTO: GenerateCoverLetterDTO,
  ): Promise<GenerateCoverLetterResponseDTO> {
    try {
      const model = this.configService.get<string>('openai.model') ?? 'gpt-4o';
      const positions =
        generateCoverLetterDTO.openPositions.join(', ') ||
        'available positions';
      const skills =
        generateCoverLetterDTO.employeeSkills.join(', ') || 'various skills';

      const completion = await this.openAI.chat.completions.create({
        model,
        temperature: 0.6,
        messages: [
          {
            role: 'system',
            content: `You are an expert career coach writing tailored cover letters. Write a professional, concise cover letter (3-4 paragraphs, ~250 words). Do not include date/address lines — just the body paragraphs starting with "Dear Hiring Team,". Be specific, enthusiastic, and professional.`,
          },
          {
            role: 'user',
            content: `Write a cover letter for:
Candidate: ${generateCoverLetterDTO.employeeName}
Current role: ${generateCoverLetterDTO.employeeJob ?? 'Professional'}
Years of experience: ${generateCoverLetterDTO.employeeExperience ?? 'Experienced'}
Skills: ${skills}
About the candidate: ${generateCoverLetterDTO.employeeDescription ?? ''}

Company: ${generateCoverLetterDTO.companyName}
Industry: ${generateCoverLetterDTO.companyIndustry ?? ''}
About the company: ${generateCoverLetterDTO.companyDescription ?? ''}
Applying for: ${positions}`,
          },
        ],
      });

      const coverLetter =
        completion.choices?.[0]?.message?.content?.trim() ?? '';
      return new GenerateCoverLetterResponseDTO({ coverLetter });
    } catch (error) {
      this.logger.error({ err: error }, 'Cover letter generation failed');
      throw new RpcException(
        error instanceof Error
          ? error.message
          : 'Cover letter generation failed',
      );
    }
  }

  async polishCoverLetter(
    polishCoverLetterDTO: PolishCoverLetterDTO,
  ): Promise<PolishCoverLetterResponseDTO> {
    try {
      const model = this.configService.get<string>('openai.model') ?? 'gpt-4o';

      const completion = await this.openAI.chat.completions.create({
        model,
        temperature: 0.4,
        messages: [
          {
            role: 'system',
            content: `You are an expert cover letter writer and career coach.
Your task is to polish the provided cover letter to make it more professional, compelling, and impactful.

Guidelines:
- Keep the same core content, structure, and specific details (company name, role, skills mentioned)
- Elevate the language to sound confident and polished — avoid clichés like "I am writing to express my interest"
- Use strong, active verbs and concrete phrasing
- Ensure the opening is engaging and the closing is memorable
- Keep roughly the same length; do not add new facts not present in the original
- Preserve all paragraph breaks
- Return only the improved cover letter text — no explanations, no headers, no markdown`,
          },
          {
            role: 'user',
            content: `Polish this cover letter:\n\n${polishCoverLetterDTO.coverLetterText}`,
          },
        ],
      });

      const coverLetter =
        completion.choices?.[0]?.message?.content?.trim() ?? '';
      return new PolishCoverLetterResponseDTO({ coverLetter });
    } catch (error) {
      this.logger.error({ err: error }, 'Cover letter polish failed');
      throw new RpcException(
        error instanceof Error ? error.message : 'Cover letter polish failed',
      );
    }
  }

  async generateCoverLetterPdf(
    generateCoverLetterPdfDTO: GenerateCoverLetterPdfDTO,
  ): Promise<GenerateCoverLetterPdfResponseDTO> {
    try {
      const date = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      const esc = (s: string) =>
        s
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;');

      // Split into paragraphs on blank lines; preserve single line-breaks inside
      const paragraphsHtml = generateCoverLetterPdfDTO.coverLetterText
        .split(/\n{2,}/)
        .map((p) => p.trim())
        .filter((p) => p.length > 0)
        .map((p) => `<p>${esc(p).replace(/\n/g, '<br />')}</p>`)
        .join('\n    ');

      const html = buildCoverLetterHtml(generateCoverLetterPdfDTO.style, {
        employeeName: generateCoverLetterPdfDTO.employeeName,
        employeeJob: generateCoverLetterPdfDTO.employeeJob,
        companyName: generateCoverLetterPdfDTO.companyName,
        companyIndustry: generateCoverLetterPdfDTO.companyIndustry,
        date,
        paragraphsHtml,
      });

      const pdfBuffer = await generatePdf(html);

      const slugify = (s: string) =>
        s
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '');

      return new GenerateCoverLetterPdfResponseDTO({
        filename: `cover-letter-${slugify(generateCoverLetterPdfDTO.employeeName)}-${slugify(generateCoverLetterPdfDTO.companyName)}.pdf`,
        mimeType: 'application/pdf',
        data: pdfBuffer.toString('base64'),
      });
    } catch (error) {
      this.logger.error({ err: error }, 'Cover letter PDF generation failed');
      throw new RpcException(
        error instanceof Error
          ? error.message
          : 'Cover letter PDF generation failed',
      );
    }
  }

  async generateInterviewPrepPdf(
    generateInterviewPrepPdfDTO: GenerateInterviewPrepPdfDTO,
  ): Promise<GenerateInterviewPrepPdfResponseDTO> {
    try {
      const html = buildInterviewPrepHtml(
        generateInterviewPrepPdfDTO.interviewTitle,
        generateInterviewPrepPdfDTO.companyName,
        generateInterviewPrepPdfDTO.companyIndustry,
        generateInterviewPrepPdfDTO.questions,
      );
      const pdfBuffer = await generatePdf(html);
      const slugify = (s: string) =>
        s
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '');
      return new GenerateInterviewPrepPdfResponseDTO({
        filename: `interview-prep-${slugify(generateInterviewPrepPdfDTO.companyName)}.pdf`,
        mimeType: 'application/pdf',
        data: pdfBuffer.toString('base64'),
      });
    } catch (error) {
      this.logger.error({ err: error }, 'Interview prep PDF generation failed');
      throw new RpcException(
        error instanceof Error
          ? error.message
          : 'Interview prep PDF generation failed',
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
        model: this.configService.get<string>('openai.model') ?? 'gpt-4o',
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
