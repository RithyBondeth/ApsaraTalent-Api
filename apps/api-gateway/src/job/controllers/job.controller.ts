import { AuthGuard } from '@app/common/guards/auth.guard';
import { IJobController } from '@app/contracts/interfaces/controller/job-controller.interface';
import { Controller, Get, Inject, Query, UseGuards } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { JOB_SERVICE } from '@app/contracts/constants/service-actions/job-service.constant';
import {
  JobResponseDTO,
  SearchJobResponseDTO,
  SearchJobDTO,
} from '@app/contracts/dtos/job';
import { PaginationDTO } from '@app/contracts/dtos/shared';
import { rpcCall } from '../../utils/rpc-call';

@Controller('job')
@UseGuards(AuthGuard)
export class JobController implements IJobController {
  constructor(
    @Inject(JOB_SERVICE.NAME) private readonly jobClient: ClientProxy,
  ) {}

  @Get('all')
  async findAllJobs(
    @Query() pagination: PaginationDTO,
  ): Promise<JobResponseDTO[]> {
    return rpcCall<JobResponseDTO[]>(
      this.jobClient,
      JOB_SERVICE.ACTIONS.FIND_ALL_JOBS,
      { skip: pagination.skip ?? 0, limit: pagination.limit ?? 20 },
    );
  }

  @Get('search')
  async searchJobs(
    @Query() searchJobQuery: SearchJobDTO,
  ): Promise<SearchJobResponseDTO[]> {
    const transformedQuery = {
      ...searchJobQuery,
      ...(searchJobQuery.companySizeMin && {
        companySizeMin: Number(searchJobQuery.companySizeMin),
      }),
      ...(searchJobQuery.companySizeMax && {
        companySizeMax: Number(searchJobQuery.companySizeMax),
      }),
    };

    return rpcCall<SearchJobResponseDTO[]>(
      this.jobClient,
      JOB_SERVICE.ACTIONS.SEARCH_JOBS,
      transformedQuery,
    );
  }
}
