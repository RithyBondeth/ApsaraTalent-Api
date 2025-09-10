import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { RESUME_BUILDER_SERVICE } from 'utils/constants/resume-builder-service.constant';
import { ResumeBuilderService } from '../services/resume-builder.service';
import { BuildResumeDTO } from '../dtos/resume-builder.dto';
import { IResumeBuilderController } from '@app/common/interfaces/resume-controller.interface';

@Controller()
export class ResumeBuilderController implements IResumeBuilderController {
  constructor(private readonly resumeBuilderService: ResumeBuilderService) {}

  @MessagePattern(RESUME_BUILDER_SERVICE.ACTIONS.BUILD_RESUME)
  async buildResume(@Payload() buildResumeDTO: BuildResumeDTO): Promise<any> {
    return await this.resumeBuilderService.buildResume(buildResumeDTO);
  }
}
