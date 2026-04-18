import { IJobController } from '@app/contracts/interfaces/controller/job-controller.interface';
import { Controller, Inject } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { JOB_SERVICE } from '@app/contracts/constants/service-actions/job-service.constant';
import { JobResponseDTO, SearchJobDTO } from '@app/contracts/dtos/job';

import {
  I_JOB_SERVICE_SERVICE,
  IJobServiceService,
} from '@app/contracts/interfaces/service/job-service.interface';
import { PaginationDTO } from '@app/contracts';

@Controller()
export class JobController implements IJobController {
  constructor(
    @Inject(I_JOB_SERVICE_SERVICE)
    private readonly jobService: IJobServiceService,
  ) {}

  @MessagePattern(JOB_SERVICE.ACTIONS.FIND_ALL_JOBS)
  findAllJobs(
    @Payload() paginationDTO: PaginationDTO,
  ): Promise<JobResponseDTO[]> {
    return this.jobService.findAllJobs(paginationDTO);
  }

  @MessagePattern(JOB_SERVICE.ACTIONS.SEARCH_JOBS)
  searchJobs(@Payload() searchJobDTO: SearchJobDTO): Promise<JobResponseDTO[]> {
    return this.jobService.searchJobs(searchJobDTO);
  }
}
