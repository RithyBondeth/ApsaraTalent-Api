import { Controller, Get, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { JOB_SERVICE } from 'utils/constants/job-service.constant';

@Controller('job')
export class JobController {
  constructor(@Inject(JOB_SERVICE.NAME) private readonly jobClient: ClientProxy) {}

  @Get('all')
  async findAllJobs() {
    return firstValueFrom(
      this.jobClient.send(JOB_SERVICE.ACTIONS.FIND_ALL_JOBS, {})
    );
  }
}
