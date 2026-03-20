import { IResumeBuilderController } from '@app/common/interfaces/resume-controller.interface';
import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { RESUME_BUILDER_SERVICE } from 'utils/constants/resume-builder-service.constant';
import { BuildResumeDTO } from '../dtos/resume-builder.dto';
import { ResumeBuilderService } from '../services/resume-builder.service';

const BUILD_RESUME_PATTERN = { cmd: 'build-resume' } as const;
const LEGACY_BUILD_RESUME_PATTERN = { cmd: 'build-resume ' } as const;

@Controller()
export class ResumeBuilderController implements IResumeBuilderController {
  constructor(private readonly resumeBuilderService: ResumeBuilderService) {}

  @MessagePattern(LEGACY_BUILD_RESUME_PATTERN)
  @MessagePattern(BUILD_RESUME_PATTERN)
  @MessagePattern(RESUME_BUILDER_SERVICE.ACTIONS.BUILD_RESUME)
  async buildResume(@Payload() buildResumeDTO: BuildResumeDTO): Promise<any> {
    return await this.resumeBuilderService.buildResume(buildResumeDTO);
  }
}
