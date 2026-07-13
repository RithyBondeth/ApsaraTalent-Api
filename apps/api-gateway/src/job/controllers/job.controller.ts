import { AuthGuard } from '@app/common/guards/auth.guard';
import { AuthUser, User } from '@app/common/decorators/user.decorator';
import { IJobController } from '@app/contracts/interfaces/controller/job-controllers/job-controller.interface';
import { Controller, Get, Inject, Query, UseGuards } from '@nestjs/common';
import {
  JobResponseDTO,
  SearchJobResult,
  SearchJobDTO,
} from '@app/contracts/dtos/job';
import { PaginationDTO } from '@app/contracts/dtos/shared';
import { JOB_SERVICE } from '@app/contracts';
import { ClientProxy } from '@nestjs/microservices';
import { rpcCall } from '../../utils/rpc-call';

@Controller('job')
@UseGuards(AuthGuard)
export class JobController implements IJobController {
  constructor(
    @Inject(JOB_SERVICE.NAME) private readonly jobClient: ClientProxy,
  ) {}

  @Get('all')
  async findAllJobs(
    @Query() paginationDTO: PaginationDTO,
  ): Promise<JobResponseDTO[]> {
    return rpcCall<JobResponseDTO[]>(
      this.jobClient,
      JOB_SERVICE.ACTIONS.FIND_ALL_JOBS,
      {
        skip: paginationDTO.skip ?? 0,
        limit: paginationDTO.limit ?? 20,
      },
    );
  }

  @Get('search')
  async searchJobs(
    @User() user: AuthUser,
    @Query() searchJobDTO: SearchJobDTO,
  ): Promise<SearchJobResult> {
    const payload = {
      ...searchJobDTO,
      ...(searchJobDTO.companySizeMin && {
        companySizeMin: Number(searchJobDTO.companySizeMin),
      }),
      ...(searchJobDTO.companySizeMax && {
        companySizeMax: Number(searchJobDTO.companySizeMax),
      }),
      ...(searchJobDTO.salaryMin && {
        salaryMin: Number(searchJobDTO.salaryMin),
      }),
      ...(searchJobDTO.salaryMax && {
        salaryMax: Number(searchJobDTO.salaryMax),
      }),
      ...(searchJobDTO.page && { page: Number(searchJobDTO.page) }),
      ...(searchJobDTO.pageSize && { pageSize: Number(searchJobDTO.pageSize) }),
      requesterId: user.id,
    };

    return rpcCall<SearchJobResult>(
      this.jobClient,
      JOB_SERVICE.ACTIONS.SEARCH_JOBS,
      payload,
      20_000,
    );
  }
}
