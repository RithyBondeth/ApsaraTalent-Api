import { AuthGuard } from '@app/common/guards/auth.guard';
import { IMatchingController } from '@app/common/interfaces/job-controller.interface';
import {
  Controller,
  Get,
  Inject,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { JOB_SERVICE } from 'utils/constants/job-service.constant';

@Controller('match')
@UseGuards(AuthGuard)
export class JobMatchingController implements IMatchingController {
  constructor(
    @Inject(JOB_SERVICE.NAME) private readonly jobClient: ClientProxy,
  ) {}

  @Post('employee/:eid/like/:cid')
  async employeeLikes(
    @Param('eid', ParseUUIDPipe) eid: string,
    @Param('cid', ParseUUIDPipe) cid: string,
  ): Promise<any> {
    const payload = { eid, cid };
    return firstValueFrom(
      this.jobClient.send(JOB_SERVICE.ACTIONS.EMPLOYEE_LIKES, payload),
    );
  }

  @Post('company/:cid/like/:eid')
  async companyLikes(
    @Param('cid', ParseUUIDPipe) cid: string,
    @Param('eid', ParseUUIDPipe) eid: string,
  ): Promise<any> {
    const payload = { cid, eid };
    return firstValueFrom(
      this.jobClient.send(JOB_SERVICE.ACTIONS.COMPANY_LIKES, payload),
    );
  }

  @Get('current-employee-liked/:eid')
  async findCurrentEmployeeLiked(
    @Param('eid', ParseUUIDPipe) eid: string,
  ): Promise<any> {
    const payload = { eid };
    return firstValueFrom(
      this.jobClient.send(
        JOB_SERVICE.ACTIONS.FIND_CURRENT_EMPLOYEE_LIKED,
        payload,
      ),
    );
  }

  @Get('current-company-liked/:cid')
  async findCurrentCompanyLiked(
    @Param('cid', ParseUUIDPipe) cid: string,
  ): Promise<any> {
    const payload = { cid };
    return firstValueFrom(
      this.jobClient.send(
        JOB_SERVICE.ACTIONS.FIND_CURRENT_COMPANY_LIKED,
        payload,
      ),
    );
  }

  @Get('current-employee-matching/:eid')
  async findCurrentEmployeeMatching(
    @Param('eid', ParseUUIDPipe) eid: string,
  ): Promise<any> {
    const payload = { eid };
    return firstValueFrom(
      this.jobClient.send(
        JOB_SERVICE.ACTIONS.FIND_CURRENT_EMPLOYEE_MATCHING,
        payload,
      ),
    );
  }

  @Get('current-company-matching/:cid')
  async findCurrentCompanyMatching(
    @Param('cid', ParseUUIDPipe) cid: string,
  ): Promise<any> {
    const payload = { cid };
    return firstValueFrom(
      this.jobClient.send(
        JOB_SERVICE.ACTIONS.FIND_CURRENT_COMPANY_MATCHING,
        payload,
      ),
    );
  }
}
