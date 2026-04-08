import { IJobController } from '@app/contracts/interfaces/job-controller.interface';
import { Controller, Inject } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { JOB_SERVICE } from '@app/contracts/constants/job-service.constant';
import { JobResponseDTO } from '../dtos/job-response.dto';
import { SearchJobDto } from '../dtos/job-search.dto';
import { JobServiceService } from '../services/job-service.service';

import {
  I_JOB_SERVICE_SERVICE,
  IJobServiceService,
} from '@app/contracts/interfaces/job-service.interface';

@Controller()
export class JobServiceController implements IJobController {
  constructor(
    @Inject(I_JOB_SERVICE_SERVICE)
    private readonly jobServiceService: IJobServiceService,
  ) {}

  @MessagePattern(JOB_SERVICE.ACTIONS.FIND_ALL_JOBS)
  findAllJobs(): Promise<JobResponseDTO[]> {
    return this.jobServiceService.findAllJobs();
  }

  @MessagePattern(JOB_SERVICE.ACTIONS.SEARCH_JOBS)
  searchJobs(@Payload() searchJobDTO: SearchJobDto): Promise<JobResponseDTO[]> {
    return this.jobServiceService.searchJobs(searchJobDTO);
  }
}
