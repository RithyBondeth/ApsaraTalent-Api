import { AuthGuard } from '@app/common/guards/auth.guard';
import { IJobController } from '@app/contracts/interfaces/controller/job-controller.interface';
import { Controller, Get, Inject, Query, UseGuards } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { JOB_SERVICE } from '@app/contracts/constants/service-actions/job-service.constant';
import { JobResponseDTO } from 'apps/job-service/src/dtos/job-response.dto';
import { SearchJobDto } from 'apps/job-service/src/dtos/job-search.dto';

@Controller('job')
@UseGuards(AuthGuard)
export class JobController implements IJobController {
  constructor(
    @Inject(JOB_SERVICE.NAME) private readonly jobClient: ClientProxy,
  ) {}

  @Get('all')
  async findAllJobs(): Promise<JobResponseDTO[]> {
    return firstValueFrom(
      this.jobClient.send<JobResponseDTO[]>(
        JOB_SERVICE.ACTIONS.FIND_ALL_JOBS,
        {},
      ),
    );
  }

  @Get('search')
  async searchJobs(@Query() searchJobQuery: SearchJobDto): Promise<JobResponseDTO[]> {
    const transformedQuery = {
      ...searchJobQuery,
      ...(searchJobQuery.companySizeMin && {
        companySizeMin: Number(searchJobQuery.companySizeMin),
      }),
      ...(searchJobQuery.companySizeMax && {
        companySizeMax: Number(searchJobQuery.companySizeMax),
      }),
    };

    return firstValueFrom(
      this.jobClient.send<JobResponseDTO[]>(
        JOB_SERVICE.ACTIONS.SEARCH_JOBS,
        transformedQuery,
      ),
    );
  }
}
