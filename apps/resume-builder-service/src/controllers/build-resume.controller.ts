import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { RESUME_BUILDER_SERVICE } from 'utils/constants/resume-builder-service';
import { BuildResumeService } from '../services/build-resume.service';
import { BuildResumeDto } from '../dtos/build-resume.dto';
import { IResumeBuilderController } from '@app/common/interfaces/resume-controller.interface';

@Controller()
export class BuildeResumeController implements IResumeBuilderController {
  constructor(private readonly buildResumeService: BuildResumeService) {}

  @MessagePattern(RESUME_BUILDER_SERVICE.ACTIONS.BUILD_RESUME)
  async buildResume(@Payload() buildResumeDTO: BuildResumeDto): Promise<any> {
    return await this.buildResumeService.buildResume(buildResumeDTO);
  }
}
