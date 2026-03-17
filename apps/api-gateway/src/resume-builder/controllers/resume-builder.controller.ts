import { AuthGuard } from '@app/common/guards/auth.guard';
import { IResumeBuilderController } from '@app/common/interfaces/resume-controller.interface';
import {
    Body,
    Controller,
    HttpCode,
    HttpStatus,
    Inject,
    Post,
    UseGuards
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { BuildResumeDTO } from '../../../../resume-builder-service/src/dtos/resume-builder.dto';
import { RESUME_BUILDER_SERVICE } from 'utils/constants/resume-builder-service.constant';

@Controller('resume')
@UseGuards(AuthGuard)
export class ResumeBuilderController implements IResumeBuilderController {
  constructor(
    @Inject(RESUME_BUILDER_SERVICE.NAME)
    private readonly resumeBuilderClient: ClientProxy,
  ) {}

  @Post('build-resume')
  @HttpCode(HttpStatus.CREATED)
  async buildResume(@Body() buildResumeDTO: BuildResumeDTO): Promise<any> {
    return firstValueFrom(
      this.resumeBuilderClient.send(
        RESUME_BUILDER_SERVICE.ACTIONS.BUILD_RESUME,
        buildResumeDTO,
      ),
    );
  }
}
