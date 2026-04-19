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
import {
  MatchResponseDTO,
  MatchCountResponseDTO,
  AnalyticsResponseDTO,
  FindCurrentMatchingResponseDTO,
  FindCurrentLikeResponseDTO,
  MatchDTO,
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
    @Param() matchDto: MatchDTO,
    @Req() req?: any,
  ): Promise<MatchResponseDTO> {
    await this.assertEmployeeAccess(req?.user?.id, matchDto.eid);
    return rpcCall<MatchResponseDTO>(
      this.jobClient,
      JOB_SERVICE.ACTIONS.EMPLOYEE_LIKES,
      matchDto,
    );
  }

  @Post('company/:cid/like/:eid')
  async companyLikes(
    @Param() matchDto: MatchDTO,
    @Req() req?: any,
  ): Promise<MatchResponseDTO> {
    await this.assertCompanyAccess(req?.user?.id, matchDto.cid);
    return rpcCall<MatchResponseDTO>(
      this.jobClient,
      JOB_SERVICE.ACTIONS.COMPANY_LIKES,
      matchDto,
    );
  }

  @Get('current-employee-liked/:eid')
  async findCurrentEmployeeLiked(
    @Param('eid', ParseUUIDPipe) eid: string,
    @Req() req?: any,
  ): Promise<FindCurrentLikeResponseDTO[]> {
    await this.assertEmployeeAccess(req?.user?.id, eid);
    return rpcCall<FindCurrentLikeResponseDTO[]>(
      this.jobClient,
      JOB_SERVICE.ACTIONS.FIND_CURRENT_EMPLOYEE_LIKED,
      { eid },
    );
  }

  @Get('current-company-liked/:cid')
  async findCurrentCompanyLiked(
    @Param('cid', ParseUUIDPipe) cid: string,
    @Req() req?: any,
  ): Promise<FindCurrentLikeResponseDTO[]> {
    await this.assertCompanyAccess(req?.user?.id, cid);
    return rpcCall<FindCurrentLikeResponseDTO[]>(
      this.jobClient,
      JOB_SERVICE.ACTIONS.FIND_CURRENT_COMPANY_LIKED,
      { cid },
    );
  }

  @Get('current-employee-matching/:eid')
  async findCurrentEmployeeMatching(
    @Param('eid', ParseUUIDPipe) eid: string,
    @Req() req?: any,
  ): Promise<FindCurrentMatchingResponseDTO[]> {
    await this.assertEmployeeAccess(req?.user?.id, eid);
    return rpcCall<FindCurrentMatchingResponseDTO[]>(
      this.jobClient,
      JOB_SERVICE.ACTIONS.FIND_CURRENT_EMPLOYEE_MATCHING,
      { eid },
    );
  }

  @Get('current-company-matching/:cid')
  async findCurrentCompanyMatching(
    @Param('cid', ParseUUIDPipe) cid: string,
    @Req() req?: any,
  ): Promise<FindCurrentMatchingResponseDTO[]> {
    await this.assertCompanyAccess(req?.user?.id, cid);
    return rpcCall<FindCurrentMatchingResponseDTO[]>(
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
    return rpcCall<MatchCountResponseDTO>(
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
    return rpcCall<MatchCountResponseDTO>(
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
    return rpcCall<AnalyticsResponseDTO>(
      this.jobClient,
      JOB_SERVICE.ACTIONS.GET_ANALYTICS,
      {
        userId: id,
        role,
      },
    );
  }
}
