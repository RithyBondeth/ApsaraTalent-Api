import { IJobController } from '@app/common/interfaces/job-controller.interface';
import { Controller, Get, Inject, Query } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { JOB_SERVICE } from 'utils/constants/job-service.constant';

@Controller('job')
export class JobController implements IJobController {
  constructor(@Inject(JOB_SERVICE.NAME) private readonly jobClient: ClientProxy) {}

  @Get('all')
  async findAllJobs(): Promise<any> {
    return firstValueFrom(
      this.jobClient.send(JOB_SERVICE.ACTIONS.FIND_ALL_JOBS, {})
    );
  }

  @Get('search')
  async searchJobs(@Query() searchJobQuery: any): Promise<any> {
    const transformedQuery = { 
      ...searchJobQuery,
      ...(searchJobQuery.companySizeMin && { 
        companySizeMin: Number(searchJobQuery.companySizeMin) 
      }),
      ...(searchJobQuery.companySizeMax && { 
        companySizeMax: Number(searchJobQuery.companySizeMax) 
      }),
    };

    return firstValueFrom(
      this.jobClient.send(JOB_SERVICE.ACTIONS.SEARCH_JOBS, transformedQuery)
    )
  }
}
