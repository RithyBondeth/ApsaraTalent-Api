import { AuthGuard } from '@app/common/guards/auth.guard';
import { IMatchingController } from '@app/contracts/interfaces/controller/job-controller.interface';
import {
  Controller,
  Get,
  Inject,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { JOB_SERVICE } from '@app/contracts/constants/service-actions/job-service.constant';
import { USER_SERVICE } from '@app/contracts/constants/service-actions/user-service.constant';
import { JobAccessBase } from '../shared/job-access.base';

@Controller('match')
@UseGuards(AuthGuard)
export class JobMatchingController extends JobAccessBase implements IMatchingController {
  constructor(
    @Inject(JOB_SERVICE.NAME) private readonly jobClient: ClientProxy,
    @Inject(USER_SERVICE.NAME) userClient: ClientProxy,
  ) {
    super(userClient);
  }

  @Post('employee/:eid/like/:cid')
  async employeeLikes(
    @Param('eid', ParseUUIDPipe) eid: string,
    @Param('cid', ParseUUIDPipe) cid: string,
    @Req() req?: any,
  ): Promise<any> {
    await this.assertEmployeeAccess(req?.user?.id, eid);
    const payload = { eid, cid };
    return firstValueFrom(
      this.jobClient.send(JOB_SERVICE.ACTIONS.EMPLOYEE_LIKES, payload),
    );
  }

  @Post('company/:cid/like/:eid')
  async companyLikes(
    @Param('cid', ParseUUIDPipe) cid: string,
    @Param('eid', ParseUUIDPipe) eid: string,
    @Req() req?: any,
  ): Promise<any> {
    await this.assertCompanyAccess(req?.user?.id, cid);
    const payload = { cid, eid };
    return firstValueFrom(
      this.jobClient.send(JOB_SERVICE.ACTIONS.COMPANY_LIKES, payload),
    );
  }

  @Get('current-employee-liked/:eid')
  async findCurrentEmployeeLiked(
    @Param('eid', ParseUUIDPipe) eid: string,
    @Req() req?: any,
  ): Promise<any> {
    await this.assertEmployeeAccess(req?.user?.id, eid);
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
    @Req() req?: any,
  ): Promise<any> {
    await this.assertCompanyAccess(req?.user?.id, cid);
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
    @Req() req?: any,
  ): Promise<any> {
    await this.assertEmployeeAccess(req?.user?.id, eid);
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
    @Req() req?: any,
  ): Promise<any> {
    await this.assertCompanyAccess(req?.user?.id, cid);
    const payload = { cid };
    return firstValueFrom(
      this.jobClient.send(
        JOB_SERVICE.ACTIONS.FIND_CURRENT_COMPANY_MATCHING,
        payload,
      ),
    );
  }

  @Get('current-employee-matching-count/:eid')
  async findCurrentEmployeeMatchingCount(
    @Param('eid', ParseUUIDPipe) eid: string,
    @Req() req?: any,
  ): Promise<any> {
    await this.assertEmployeeAccess(req?.user?.id, eid);
    const payload = { eid };
    return firstValueFrom(
      this.jobClient.send(
        JOB_SERVICE.ACTIONS.FIND_CURRENT_EMPLOYEE_MATCHING_COUNT,
        payload,
      ),
    );
  }

  @Get('current-company-matching-count/:cid')
  async findCurrentCompanyMatchingCount(
    @Param('cid', ParseUUIDPipe) cid: string,
    @Req() req?: any,
  ): Promise<any> {
    await this.assertCompanyAccess(req?.user?.id, cid);
    const payload = { cid };
    return firstValueFrom(
      this.jobClient.send(
        JOB_SERVICE.ACTIONS.FIND_CURRENT_COMPANY_MATCHING_COUNT,
        payload,
      ),
    );
  }

  @Get('analytics/:id')
  async getAnalytics(@Param('id') id: string, @Query('role') role: string) {
    return firstValueFrom(
      this.jobClient.send(JOB_SERVICE.ACTIONS.GET_ANALYTICS, {
        userId: id,
        role,
      }),
    );
  }
}
