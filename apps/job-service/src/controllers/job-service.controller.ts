import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { JOB_SERVICE } from 'utils/constants/job-service.constant';
import { JobServiceService } from '../services/job-service.service';
import { JobResponseDTO } from '../dtos/job-response.dto';
import { SearchJobDto } from '../dtos/job-search.dto';
import { IJobController } from '@app/common/interfaces/job-controller.interface';

@Controller()
export class JobServiceController implements IJobController {
  constructor(private readonly jobServiceService: JobServiceService) {}

  @MessagePattern(JOB_SERVICE.ACTIONS.FIND_ALL_JOBS)
  findAllJobs(): Promise<JobResponseDTO[]> {
    return this.jobServiceService.findAllJobs();
  }

  @MessagePattern(JOB_SERVICE.ACTIONS.SEARCH_JOBS)
  searchJobs(@Payload() searchJobDTO: SearchJobDto): Promise<JobResponseDTO[]> {
    return this.jobServiceService.searchJobs(searchJobDTO);
  }
}
