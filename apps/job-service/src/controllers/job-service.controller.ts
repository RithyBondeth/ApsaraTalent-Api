import { IJobController } from '@app/contracts/interfaces/controller/job-controller.interface';
import { Controller, Inject } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { JOB_SERVICE } from '@app/contracts/constants/service-actions/job-service.constant';
import { JobResponseDTO } from '../dtos/job-response.dto';
import { SearchJobDto } from '../dtos/job-search.dto';

import {
  I_JOB_SERVICE_SERVICE,
  IJobServiceService,
} from '@app/contracts/interfaces/service/job-service.interface';

@Controller()
export class JobController implements IJobController {
  constructor(
    @Inject(I_JOB_SERVICE_SERVICE)
    private readonly jobService: IJobServiceService,
  ) {}

  @MessagePattern(JOB_SERVICE.ACTIONS.FIND_ALL_JOBS)
  findAllJobs(): Promise<JobResponseDTO[]> {
    return this.jobService.findAllJobs();
  }

  @MessagePattern(JOB_SERVICE.ACTIONS.SEARCH_JOBS)
  searchJobs(@Payload() searchJobDTO: SearchJobDto): Promise<JobResponseDTO[]> {
    return this.jobService.searchJobs(searchJobDTO);
  }
}
