import { AuthGuard } from '@app/common/guards/auth.guard';
import { AiQuotaGuard } from '@app/common/throttler/guards/ai-quota.guard';
import { AiQuotaAction } from '@app/common/throttler/decorators/ai-quota-action.decorator';
import { IResumeBuilderController } from '@app/contracts/interfaces/controller/resume-builder-controller.interface';
import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { Response } from 'express';
import { RESUME } from '@app/contracts/constants/domain/resume.constant';
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
  RefineProfileBioDTO,
  GenerateResumeFromTextDTO,
} from '@app/contracts/dtos/resume';
import { AiProfileBioService } from '../services/ai-profile-bio.service';
import { RESUME_BUILDER_SERVICE } from '@app/contracts/constants/service-actions/resume-builder-service.constant';
import { rpcCall } from '../../utils/rpc-call';
import { AiStreamService } from '../../ai-stream/ai-stream.service';

@Controller('resume')
@UseGuards(AuthGuard)
export class ResumeBuilderController implements IResumeBuilderController {
  constructor(
    @Inject(RESUME_BUILDER_SERVICE.NAME)
    private readonly resumeBuilderClient: ClientProxy,
    private readonly aiStream: AiStreamService,
    private readonly aiProfileBio: AiProfileBioService,
  ) {}

  @Post('generate')
  @UseGuards(AiQuotaGuard)
  @AiQuotaAction('cvGeneration')
  @HttpCode(HttpStatus.OK)
  async generateResume(
    @Body() buildResumeDTO: BuildResumeDTO,
  ): Promise<BuildResumeDTO> {
    const aiInput = buildResumeDTO.personalInfo.profilePicture
      ? {
          ...buildResumeDTO,
          personalInfo: {
            ...buildResumeDTO.personalInfo,
            profilePicture: undefined,
          },
        }
      : buildResumeDTO;
    const generated = await rpcCall<BuildResumeDTO>(
      this.resumeBuilderClient,
      RESUME_BUILDER_SERVICE.ACTIONS.GENERATE_RESUME,
      aiInput,
      RESUME.CONTROLLER_TIMEOUT,
    );

    // Defense in depth: identity, selected style and section order always come
    // from the validated request. Only the constrained design may come from AI.
    return {
      ...generated,
      personalInfo: { ...buildResumeDTO.personalInfo },
      template: buildResumeDTO.template,
      sectionOrder: buildResumeDTO.sectionOrder
        ? [...buildResumeDTO.sectionOrder]
        : undefined,
    };
  }

  @Post('generate-from-text')
  @UseGuards(AiQuotaGuard)
  @AiQuotaAction('cvGeneration')
  @HttpCode(HttpStatus.OK)
  async generateResumeFromText(
    @Body() generateResumeFromTextDTO: GenerateResumeFromTextDTO,
  ): Promise<BuildResumeDTO> {
    const generated = await rpcCall<BuildResumeDTO>(
      this.resumeBuilderClient,
      RESUME_BUILDER_SERVICE.ACTIONS.GENERATE_RESUME_FROM_TEXT,
      generateResumeFromTextDTO,
      RESUME.CONTROLLER_TIMEOUT,
    );

    return {
      ...generated,
      template: generateResumeFromTextDTO.template,
    };
  }

  @Post('build-resume')
  @HttpCode(HttpStatus.CREATED)
  async buildResume(
    @Body() buildResumeDTO: BuildResumeDTO,
  ): Promise<BuildResumeResponseDTO> {
    return rpcCall<BuildResumeResponseDTO>(
      this.resumeBuilderClient,
      RESUME_BUILDER_SERVICE.ACTIONS.BUILD_RESUME,
      buildResumeDTO,
      RESUME.CONTROLLER_TIMEOUT,
    );
  }

  @Post('optimize')
  @UseGuards(AiQuotaGuard)
  @HttpCode(HttpStatus.OK)
  async optimizeResume(
    @Body() optimizeResumeDTO: OptimizeResumeDTO,
  ): Promise<OptimizeResumeResponseDTO> {
    return rpcCall<OptimizeResumeResponseDTO>(
      this.resumeBuilderClient,
      RESUME_BUILDER_SERVICE.ACTIONS.OPTIMIZE_RESUME,
      optimizeResumeDTO,
      RESUME.CONTROLLER_TIMEOUT,
    );
  }

  @Post('cover-letter')
  @UseGuards(AiQuotaGuard)
  @HttpCode(HttpStatus.OK)
  async generateCoverLetter(
    @Body() generateCoverLetterDTO: GenerateCoverLetterDTO,
  ): Promise<GenerateCoverLetterResponseDTO> {
    return rpcCall<GenerateCoverLetterResponseDTO>(
      this.resumeBuilderClient,
      RESUME_BUILDER_SERVICE.ACTIONS.GENERATE_COVER_LETTER,
      generateCoverLetterDTO,
      RESUME.CONTROLLER_TIMEOUT,
    );
  }

  @Post('cover-letter/stream')
  @UseGuards(AiQuotaGuard)
  async streamCoverLetter(
    @Body() generateCoverLetterDTO: GenerateCoverLetterDTO,
    @Res() res: Response,
  ): Promise<void> {
    const positions =
      generateCoverLetterDTO.openPositions?.join(', ') || 'available positions';
    const skills =
      generateCoverLetterDTO.employeeSkills?.join(', ') || 'various skills';

    await this.aiStream.pipe(
      [
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
      0.6,
      res,
      RESUME.AI_COVER_LETTER_MAX_TOKENS,
    );
  }

  @Post('polish-cover-letter')
  @UseGuards(AiQuotaGuard)
  @HttpCode(HttpStatus.OK)
  async polishCoverLetter(
    @Body() polishCoverLetterDTO: PolishCoverLetterDTO,
  ): Promise<PolishCoverLetterResponseDTO> {
    return rpcCall<PolishCoverLetterResponseDTO>(
      this.resumeBuilderClient,
      RESUME_BUILDER_SERVICE.ACTIONS.POLISH_COVER_LETTER,
      polishCoverLetterDTO,
      RESUME.CONTROLLER_TIMEOUT,
    );
  }

  @Post('polish-cover-letter/stream')
  @UseGuards(AiQuotaGuard)
  async streamPolishCoverLetter(
    @Body() polishCoverLetterDTO: PolishCoverLetterDTO,
    @Res() res: Response,
  ): Promise<void> {
    await this.aiStream.pipe(
      [
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
      0.4,
      res,
      RESUME.AI_COVER_LETTER_MAX_TOKENS,
    );
  }

  @Post('optimize/stream')
  @UseGuards(AiQuotaGuard)
  async streamOptimizeResume(
    @Body() optimizeResumeDTO: OptimizeResumeDTO,
    @Res() res: Response,
  ): Promise<void> {
    const optimizedDTO =
      optimizeResumeDTO.personalInfo?.profilePicture?.startsWith('data:')
        ? {
            ...optimizeResumeDTO,
            personalInfo: {
              ...optimizeResumeDTO.personalInfo,
              profilePicture: undefined,
            },
          }
        : optimizeResumeDTO;

    await this.aiStream.pipe(
      [
        {
          role: 'system',
          content: `You are a professional resume coach. Analyze the candidate's resume and output ONLY raw NDJSON — one complete JSON object per line, nothing else. No outer array, no markdown fences, no explanations.
            Output objects in this exact order, one per line:
            {"type":"feedback","value":"<2-3 sentence overall assessment>"}
            {"type":"summary","value":"<improved professional summary>"}
            {"type":"skill","value":"<skill name>"}
            {"type":"exp","index":<zero-based number>,"description":"<improved description>","achievements":["<bullet 1>","<bullet 2>"]}

            Rules: Output one JSON object per line. All values on a single line. Include 0-6 skill lines. Include exp lines only for experiences with meaningful improvements.`,
        },
        {
          role: 'user',
          content: `Analyze this resume:\n\n${JSON.stringify(optimizedDTO, null, 2)}`,
        },
      ],
      0.4,
      res,
      RESUME.AI_OPTIMIZE_MAX_TOKENS,
    );
  }

  @Post('cover-letter-pdf')
  @HttpCode(HttpStatus.OK)
  async generateCoverLetterPdf(
    @Body() generateCoverLetterPdfDTO: GenerateCoverLetterPdfDTO,
  ): Promise<GenerateCoverLetterPdfResponseDTO> {
    return rpcCall<GenerateCoverLetterPdfResponseDTO>(
      this.resumeBuilderClient,
      RESUME_BUILDER_SERVICE.ACTIONS.GENERATE_COVER_LETTER_PDF,
      generateCoverLetterPdfDTO,
      RESUME.CONTROLLER_TIMEOUT,
    );
  }

  @Post('interview-prep-pdf')
  @HttpCode(HttpStatus.OK)
  async generateInterviewPrepPdf(
    @Body() generateInterviewPrepPdfDTO: GenerateInterviewPrepPdfDTO,
  ): Promise<GenerateInterviewPrepPdfResponseDTO> {
    return rpcCall<GenerateInterviewPrepPdfResponseDTO>(
      this.resumeBuilderClient,
      RESUME_BUILDER_SERVICE.ACTIONS.GENERATE_INTERVIEW_PREP_PDF,
      generateInterviewPrepPdfDTO,
      RESUME.CONTROLLER_TIMEOUT,
    );
  }

  @Post('refine-bio/stream')
  @UseGuards(AiQuotaGuard)
  async streamRefineBio(
    @Body() refineProfileBioDTO: RefineProfileBioDTO,
    @Res() res: Response,
  ): Promise<void> {
    const messages = this.aiProfileBio.getMessages(refineProfileBioDTO);
    await this.aiStream.pipe(messages, 0.7, res, RESUME.AI_REFINE_MAX_TOKENS);
  }
}
