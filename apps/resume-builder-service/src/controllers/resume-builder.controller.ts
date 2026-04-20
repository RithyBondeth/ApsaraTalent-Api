import { IResumeBuilderRpcController } from '@app/contracts/interfaces/controller/resume-controller.interface';
import { Controller, Inject } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { RESUME_BUILDER_SERVICE } from '@app/contracts/constants/service-actions/resume-builder-service.constant';
import {
  BuildResumeDTO,
  BuildResumeResponseDTO,
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
}
