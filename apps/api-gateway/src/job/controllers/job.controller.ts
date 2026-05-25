import { AuthGuard } from '@app/common/guards/auth.guard';
import { IJobController } from '@app/contracts/interfaces/controller/job-controller.interface';
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  JobResponseDTO,
  SearchJobResponseDTO,
  SearchJobDTO,
} from '@app/contracts/dtos/job';
import { PaginationDTO } from '@app/contracts/dtos/shared';
import { JobService } from '../services/job.service';

@Controller('job')
@UseGuards(AuthGuard)
export class JobController implements IJobController {
  constructor(private readonly jobService: JobService) {}

  @Get('all')
  async findAllJobs(
    @Query() paginationDTO: PaginationDTO,
  ): Promise<JobResponseDTO[]> {
    return this.jobService.findAllJobs(paginationDTO);
  }

  @Get('search')
  async searchJobs(
    @Query() searchJobDTO: SearchJobDTO,
  ): Promise<SearchJobResponseDTO[]> {
    return this.jobService.searchJobs(searchJobDTO);
  }
}
