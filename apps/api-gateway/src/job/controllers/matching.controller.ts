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
import { JOB_SERVICE } from '@app/contracts/constants/service-actions/job-service.constant';
import { USER_SERVICE } from '@app/contracts/constants/service-actions/user-service.constant';
import { UserResponseDTO } from '@app/contracts/dtos/user';
import {
  MatchResponseDTO,
  MatchCountResponseDTO,
  AnalyticsResponseDTO,
} from '@app/contracts/dtos/job';
import { JobAccessBase } from '../shared/job-access.base';
import { rpcCall } from '../../utils/rpc-call';

@Controller('match')
@UseGuards(AuthGuard)
export class JobMatchingController
  extends JobAccessBase
  implements IMatchingController
{
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
  ): Promise<MatchResponseDTO> {
    await this.assertEmployeeAccess(req?.user?.id, eid);
    return rpcCall(this.jobClient, JOB_SERVICE.ACTIONS.EMPLOYEE_LIKES, {
      eid,
      cid,
    });
  }

  @Post('company/:cid/like/:eid')
  async companyLikes(
    @Param('cid', ParseUUIDPipe) cid: string,
    @Param('eid', ParseUUIDPipe) eid: string,
    @Req() req?: any,
  ): Promise<MatchResponseDTO> {
    await this.assertCompanyAccess(req?.user?.id, cid);
    return rpcCall(this.jobClient, JOB_SERVICE.ACTIONS.COMPANY_LIKES, {
      cid,
      eid,
    });
  }

  @Get('current-employee-liked/:eid')
  async findCurrentEmployeeLiked(
    @Param('eid', ParseUUIDPipe) eid: string,
    @Req() req?: any,
  ): Promise<UserResponseDTO[]> {
    await this.assertEmployeeAccess(req?.user?.id, eid);
    return rpcCall<UserResponseDTO[]>(
      this.jobClient,
      JOB_SERVICE.ACTIONS.FIND_CURRENT_EMPLOYEE_LIKED,
      { eid },
    );
  }

  @Get('current-company-liked/:cid')
  async findCurrentCompanyLiked(
    @Param('cid', ParseUUIDPipe) cid: string,
    @Req() req?: any,
  ): Promise<UserResponseDTO[]> {
    await this.assertCompanyAccess(req?.user?.id, cid);
    return rpcCall<UserResponseDTO[]>(
      this.jobClient,
      JOB_SERVICE.ACTIONS.FIND_CURRENT_COMPANY_LIKED,
      { cid },
    );
  }

  @Get('current-employee-matching/:eid')
  async findCurrentEmployeeMatching(
    @Param('eid', ParseUUIDPipe) eid: string,
    @Req() req?: any,
  ): Promise<UserResponseDTO[]> {
    await this.assertEmployeeAccess(req?.user?.id, eid);
    return rpcCall<UserResponseDTO[]>(
      this.jobClient,
      JOB_SERVICE.ACTIONS.FIND_CURRENT_EMPLOYEE_MATCHING,
      { eid },
    );
  }

  @Get('current-company-matching/:cid')
  async findCurrentCompanyMatching(
    @Param('cid', ParseUUIDPipe) cid: string,
    @Req() req?: any,
  ): Promise<UserResponseDTO[]> {
    await this.assertCompanyAccess(req?.user?.id, cid);
    return rpcCall<UserResponseDTO[]>(
      this.jobClient,
      JOB_SERVICE.ACTIONS.FIND_CURRENT_COMPANY_MATCHING,
      { cid },
    );
  }

  @Get('current-employee-matching-count/:eid')
  async findCurrentEmployeeMatchingCount(
    @Param('eid', ParseUUIDPipe) eid: string,
    @Req() req?: any,
  ): Promise<MatchCountResponseDTO> {
    await this.assertEmployeeAccess(req?.user?.id, eid);
    return rpcCall(
      this.jobClient,
      JOB_SERVICE.ACTIONS.FIND_CURRENT_EMPLOYEE_MATCHING_COUNT,
      { eid },
    );
  }

  @Get('current-company-matching-count/:cid')
  async findCurrentCompanyMatchingCount(
    @Param('cid', ParseUUIDPipe) cid: string,
    @Req() req?: any,
  ): Promise<MatchCountResponseDTO> {
    await this.assertCompanyAccess(req?.user?.id, cid);
    return rpcCall(
      this.jobClient,
      JOB_SERVICE.ACTIONS.FIND_CURRENT_COMPANY_MATCHING_COUNT,
      { cid },
    );
  }

  @Get('analytics/:id')
  async getAnalytics(
    @Param('id') id: string,
    @Query('role') role: string,
  ): Promise<AnalyticsResponseDTO> {
    return rpcCall(this.jobClient, JOB_SERVICE.ACTIONS.GET_ANALYTICS, {
      userId: id,
      role,
    });
  }
}
