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
import { BuildResumeDTO, BuildResumeResponseDTO } from '@app/contracts/dtos/resume';
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
  async buildResume(@Body() buildResumeDTO: BuildResumeDTO): Promise<BuildResumeResponseDTO> {
    return rpcCall(
      this.resumeBuilderClient,
      RESUME_BUILDER_SERVICE.ACTIONS.BUILD_RESUME,
      buildResumeDTO,
      RESUME.CONTROLLER_TIMEOUT,
    );
  }
}
