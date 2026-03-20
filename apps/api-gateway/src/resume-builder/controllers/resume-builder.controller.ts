import { AuthGuard } from '@app/common/guards/auth.guard';
import { IResumeBuilderController } from '@app/common/interfaces/resume-controller.interface';
import {
  Body,
  Controller,
  GatewayTimeoutException,
  HttpCode,
  HttpException,
  HttpStatus,
  Inject,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { TimeoutError, firstValueFrom, timeout } from 'rxjs';
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
    try {
      return await firstValueFrom(
        this.resumeBuilderClient
          .send(RESUME_BUILDER_SERVICE.ACTIONS.BUILD_RESUME, buildResumeDTO)
          .pipe(timeout(170_000)),
      );
    } catch (error) {
      if (error instanceof TimeoutError) {
        throw new GatewayTimeoutException(
          'Resume generation timed out. Please try again.',
        );
      }

      if (error instanceof HttpException) {
        throw error;
      }

      if (typeof error === 'object' && error && 'statusCode' in error) {
        const err = error as { statusCode?: number; message?: string };
        throw new HttpException(
          err.message || 'Resume generation failed',
          err.statusCode || HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      if (error instanceof Error) {
        throw new HttpException(
          error.message || 'Resume generation failed',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      throw new HttpException(
        'Resume generation failed',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
