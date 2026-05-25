import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { JOB_SERVICE } from '@app/contracts/constants/service-actions/job-service.constant';
import {
  JobResponseDTO,
  SearchJobResponseDTO,
  SearchJobDTO,
} from '@app/contracts/dtos/job';
import { PaginationDTO } from '@app/contracts/dtos/shared';
import { rpcCall } from '../../utils/rpc-call';

@Injectable()
export class JobService {
  constructor(
    @Inject(JOB_SERVICE.NAME) private readonly jobClient: ClientProxy,
  ) {}

  async findAllJobs(paginationDTO: PaginationDTO): Promise<JobResponseDTO[]> {
    return rpcCall<JobResponseDTO[]>(
      this.jobClient,
      JOB_SERVICE.ACTIONS.FIND_ALL_JOBS,
      {
        skip: paginationDTO.skip ?? 0,
        limit: paginationDTO.limit ?? 20,
      },
    );
  }

  async searchJobs(
    searchJobDTO: SearchJobDTO,
  ): Promise<SearchJobResponseDTO[]> {
    const payload = {
      ...searchJobDTO,
      ...(searchJobDTO.companySizeMin && {
        companySizeMin: Number(searchJobDTO.companySizeMin),
      }),
      ...(searchJobDTO.companySizeMax && {
        companySizeMax: Number(searchJobDTO.companySizeMax),
      }),
    };

    return rpcCall<SearchJobResponseDTO[]>(
      this.jobClient,
      JOB_SERVICE.ACTIONS.SEARCH_JOBS,
      payload,
    );
  }
}
