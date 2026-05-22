import { AuthGuard } from '@app/common/guards/auth.guard';
import { IResumeBuilderController } from '@app/contracts/interfaces/controller/resume-controller.interface';
import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
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
} from '@app/contracts/dtos/resume';
import { RESUME_BUILDER_SERVICE } from '@app/contracts/constants/service-actions/resume-builder-service.constant';
import { rpcCall } from '../../utils/rpc-call';

@Controller('resume')
@UseGuards(AuthGuard)
export class ResumeBuilderController implements IResumeBuilderController {
  constructor(
    @Inject(RESUME_BUILDER_SERVICE.NAME)
    private readonly resumeBuilderClient: ClientProxy,
  ) {}

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

  @Post('polish-cover-letter')
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
}
