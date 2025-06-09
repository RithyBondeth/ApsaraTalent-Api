import { Controller, Get } from '@nestjs/common';
import { JobServiceService } from './job-service.service';

@Controller()
export class JobServiceController {
  constructor(private readonly jobServiceService: JobServiceService) {}

  @Get()
  getHello(): string {
    return this.jobServiceService.getHello();
  }
}
