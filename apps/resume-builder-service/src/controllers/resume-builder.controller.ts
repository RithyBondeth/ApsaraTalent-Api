import { IResumeBuilderRpcController } from '@app/contracts/interfaces/controller/resume-builder-controller.interface';
import { Controller, Inject } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { RESUME_BUILDER_SERVICE } from '@app/contracts/constants/service-actions/resume-builder-service.constant';
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
import {
  I_RESUME_BUILDER_SERVICE,
  IResumeBuilderService,
} from '@app/contracts/interfaces/service/resume-builder-service.interface';

@Controller()
export class ResumeBuilderController implements IResumeBuilderRpcController {
  constructor(
    @Inject(I_RESUME_BUILDER_SERVICE)
    private readonly resumeBuilderService: IResumeBuilderService,
  ) {}

  @MessagePattern(RESUME_BUILDER_SERVICE.ACTIONS.BUILD_RESUME)
  async buildResume(
    @Payload() buildResumeDTO: BuildResumeDTO,
  ): Promise<BuildResumeResponseDTO> {
    return await this.resumeBuilderService.buildResume(buildResumeDTO);
  }

  @MessagePattern(RESUME_BUILDER_SERVICE.ACTIONS.OPTIMIZE_RESUME)
  async optimizeResume(
    @Payload() optimizeResumeDTO: OptimizeResumeDTO,
  ): Promise<OptimizeResumeResponseDTO> {
    return await this.resumeBuilderService.optimizeResume(optimizeResumeDTO);
  }

  @MessagePattern(RESUME_BUILDER_SERVICE.ACTIONS.GENERATE_COVER_LETTER)
  async generateCoverLetter(
    @Payload() generateCoverLetterDTO: GenerateCoverLetterDTO,
  ): Promise<GenerateCoverLetterResponseDTO> {
    return await this.resumeBuilderService.generateCoverLetter(
      generateCoverLetterDTO,
    );
  }

  @MessagePattern(RESUME_BUILDER_SERVICE.ACTIONS.POLISH_COVER_LETTER)
  async polishCoverLetter(
    @Payload() polishCoverLetterDTO: PolishCoverLetterDTO,
  ): Promise<PolishCoverLetterResponseDTO> {
    return await this.resumeBuilderService.polishCoverLetter(
      polishCoverLetterDTO,
    );
  }

  @MessagePattern(RESUME_BUILDER_SERVICE.ACTIONS.GENERATE_COVER_LETTER_PDF)
  async generateCoverLetterPdf(
    @Payload() generateCoverLetterPdfDTO: GenerateCoverLetterPdfDTO,
  ): Promise<GenerateCoverLetterPdfResponseDTO> {
    return await this.resumeBuilderService.generateCoverLetterPdf(
      generateCoverLetterPdfDTO,
    );
  }

  @MessagePattern(RESUME_BUILDER_SERVICE.ACTIONS.GENERATE_INTERVIEW_PREP_PDF)
  async generateInterviewPrepPdf(
    @Payload() generateInterviewPrepPdfDTO: GenerateInterviewPrepPdfDTO,
  ): Promise<GenerateInterviewPrepPdfResponseDTO> {
    return await this.resumeBuilderService.generateInterviewPrepPdf(
      generateInterviewPrepPdfDTO,
    );
  }
}
