import { Controller } from '@nestjs/common';
import { JobServiceService } from './job-service.service';
import { MessagePattern } from '@nestjs/microservices';
import { JOB_SERVICE } from 'utils/constants/job-service.constant';

@Controller()
export class JobServiceController {
  constructor(private readonly jobServiceService: JobServiceService) {}

  @MessagePattern(JOB_SERVICE.ACTIONS.FIND_ALL_JOBS)
  findAllJobs() {
    return this.jobServiceService.findAllJobs();
  }
}
