import { AuthGuard } from '@app/common/guards/auth.guard';
import { IMatchingController } from '@app/contracts/interfaces/controller/job-controllers/job-controller.interface';
import {
  Controller,
  Get,
  Inject,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { Response } from 'express';
import { JOB_SERVICE } from '@app/contracts/constants/service-actions/job-service.constant';
import { JOB } from '@app/contracts/constants/domain/job.constant';
import {
  MatchResponseDTO,
  MatchCountResponseDTO,
  MatchingAnalyticsResponseDTO,
  FindCurrentMatchingResponseDTO,
  FindCurrentLikeResponseDTO,
  MatchDTO,
  AiMatchExplanationResponseDTO,
  AiInterviewPrepResponseDTO,
} from '@app/contracts/dtos/job';
import { rpcCall } from '../../utils/rpc-call';
import { SocketBroadcastService } from '../../socket/socket-broadcast.service';
import { AiStreamService } from '../../ai-stream/ai-stream.service';
import { AiMatchingService } from '../services/ai-matching.service';
import { JobAccessService } from '../services/job-access.service';

@Controller('match')
@UseGuards(AuthGuard)
export class JobMatchingController implements IMatchingController {
  constructor(
    @Inject(JOB_SERVICE.NAME) private readonly jobClient: ClientProxy,
    private readonly socketBroadcastService: SocketBroadcastService,
    private readonly aiStream: AiStreamService,
    private readonly aiMatching: AiMatchingService,
    private readonly jobAccess: JobAccessService,
  ) {}

  @Post('employee/:eid/like/:cid')
  async employeeLikes(
    @Param() matchDTO: MatchDTO,
    @Req() req?: any,
  ): Promise<MatchResponseDTO> {
    await this.jobAccess.assertEmployeeAccess(req?.user?.id, matchDTO.eid);
    const result = await rpcCall<MatchResponseDTO>(
      this.jobClient,
      JOB_SERVICE.ACTIONS.EMPLOYEE_LIKES,
      matchDTO,
    );
    result.notificationTargets?.forEach((userId) => {
      this.socketBroadcastService.emitToUser(userId, 'badgeIncrement');
    });
    return result;
  }

  @Post('company/:cid/like/:eid')
  async companyLikes(
    @Param() matchDTO: MatchDTO,
    @Req() req?: any,
  ): Promise<MatchResponseDTO> {
    await this.jobAccess.assertCompanyAccess(req?.user?.id, matchDTO.cid);
    const result = await rpcCall<MatchResponseDTO>(
      this.jobClient,
      JOB_SERVICE.ACTIONS.COMPANY_LIKES,
      matchDTO,
    );
    result.notificationTargets?.forEach((userId) => {
      this.socketBroadcastService.emitToUser(userId, 'badgeIncrement');
    });
    return result;
  }

  @Get('current-employee-liked/:eid')
  async findCurrentEmployeeLiked(
    @Param('eid', ParseUUIDPipe) eid: string,
    @Req() req?: any,
  ): Promise<FindCurrentLikeResponseDTO[]> {
    await this.jobAccess.assertEmployeeAccess(req?.user?.id, eid);
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
    await this.jobAccess.assertCompanyAccess(req?.user?.id, cid);
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
    await this.jobAccess.assertEmployeeAccess(req?.user?.id, eid);
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
    await this.jobAccess.assertCompanyAccess(req?.user?.id, cid);
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
    await this.jobAccess.assertEmployeeAccess(req?.user?.id, eid);
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
    await this.jobAccess.assertCompanyAccess(req?.user?.id, cid);
    return rpcCall<MatchCountResponseDTO>(
      this.jobClient,
      JOB_SERVICE.ACTIONS.FIND_CURRENT_COMPANY_MATCHING_COUNT,
      { cid },
    );
  }

  @Get('analytics/:id')
  async getMatchingAnalytics(
    @Param('id') id: string,
    @Query('role') role: string,
  ): Promise<MatchingAnalyticsResponseDTO> {
    return rpcCall<MatchingAnalyticsResponseDTO>(
      this.jobClient,
      JOB_SERVICE.ACTIONS.GET_ANALYTICS,
      { userId: id, role },
    );
  }

  @Get('ai-explanation/:eid/:cid')
  @HttpCode(HttpStatus.OK)
  async getAiMatchExplanation(
    @Param('eid', ParseUUIDPipe) eid: string,
    @Param('cid', ParseUUIDPipe) cid: string,
    @Req() req?: any,
  ): Promise<AiMatchExplanationResponseDTO> {
    await this.jobAccess.assertMatchParticipantAccess(req?.user?.id, eid, cid);
    return rpcCall<AiMatchExplanationResponseDTO>(
      this.jobClient,
      JOB_SERVICE.ACTIONS.AI_MATCH_EXPLANATION,
      { eid, cid },
      JOB.AI_CONTROLLER_TIMEOUT,
    );
  }

  @Get('ai-explanation/:eid/:cid/stream')
  async streamAiMatchExplanation(
    @Param('eid', ParseUUIDPipe) eid: string,
    @Param('cid', ParseUUIDPipe) cid: string,
    @Req() req: any,
    @Res() res: Response,
  ): Promise<void> {
    await this.jobAccess.assertMatchParticipantAccess(req?.user?.id, eid, cid);

    const { employeeProfile, companyProfile } = await rpcCall<{
      employeeProfile: any;
      companyProfile: any;
    }>(this.jobClient, JOB_SERVICE.ACTIONS.GET_AI_MATCH_PROFILES, { eid, cid });

    await this.aiStream.pipe(
      this.aiMatching.getMatchExplanationMessages(
        employeeProfile,
        companyProfile,
      ),
      0.3,
      res,
    );
  }

  @Get('ai-interview-prep/:eid/:cid')
  @HttpCode(HttpStatus.OK)
  async getAiInterviewPrep(
    @Param('eid', ParseUUIDPipe) eid: string,
    @Param('cid', ParseUUIDPipe) cid: string,
    @Query('interviewTitle') interviewTitle?: string,
    @Req() req?: any,
  ): Promise<AiInterviewPrepResponseDTO> {
    await this.jobAccess.assertMatchParticipantAccess(req?.user?.id, eid, cid);
    return rpcCall<AiInterviewPrepResponseDTO>(
      this.jobClient,
      JOB_SERVICE.ACTIONS.AI_INTERVIEW_PREP,
      { eid, cid, interviewTitle },
      JOB.AI_CONTROLLER_TIMEOUT,
    );
  }

  @Get('ai-interview-prep/:eid/:cid/stream')
  async streamAiInterviewPrep(
    @Param('eid', ParseUUIDPipe) eid: string,
    @Param('cid', ParseUUIDPipe) cid: string,
    @Query('interviewTitle') interviewTitle: string | undefined,
    @Req() req: any,
    @Res() res: Response,
  ): Promise<void> {
    await this.jobAccess.assertMatchParticipantAccess(req?.user?.id, eid, cid);

    const { employeeProfile, companyProfile } = await rpcCall<{
      employeeProfile: any;
      companyProfile: any;
    }>(this.jobClient, JOB_SERVICE.ACTIONS.GET_AI_MATCH_PROFILES, { eid, cid });

    await this.aiStream.pipe(
      this.aiMatching.getInterviewPrepMessages(
        employeeProfile,
        companyProfile,
        interviewTitle,
      ),
      0.4,
      res,
    );
  }

  @Get('ai-skill-gap/:eid/:cid/stream')
  async streamAiSkillGap(
    @Param('eid', ParseUUIDPipe) eid: string,
    @Param('cid', ParseUUIDPipe) cid: string,
    @Req() req: any,
    @Res() res: Response,
  ): Promise<void> {
    await this.jobAccess.assertMatchParticipantAccess(req?.user?.id, eid, cid);

    const { employeeProfile, companyProfile } = await rpcCall<{
      employeeProfile: any;
      companyProfile: any;
    }>(this.jobClient, JOB_SERVICE.ACTIONS.GET_AI_MATCH_PROFILES, { eid, cid });

    await this.aiStream.pipe(
      this.aiMatching.getSkillGapMessages(employeeProfile, companyProfile),
      0.3,
      res,
    );
  }
}
