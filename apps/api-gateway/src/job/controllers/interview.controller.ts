import { AuthGuard } from '@app/common/guards/auth.guard';
import { JOB_SERVICE } from '@app/contracts/constants/service-actions/job-service.constant';
import {
  CreateInterviewDTO,
  CreateInterviewResponseDTO,
  GetInterviewResponseDTO,
  UpdateInterviewStatusResponseDTO,
  UpdateInterviewStatusDTO,
} from '@app/contracts/dtos/job';
import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Inject,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { rpcCall } from '../../utils/rpc-call';
import { SocketBroadcastService } from '../../shared/socket/socket-broadcast.service';
import { JobAccessService } from '../services/job-access.service';
import { IInterviewController } from '@app/contracts/interfaces/controller/job-controllers/interview-controller.interface';

@Controller('match/interview')
@UseGuards(AuthGuard)
export class InterviewController implements IInterviewController {
  constructor(
    @Inject(JOB_SERVICE.NAME) private readonly jobClient: ClientProxy,
    private readonly socketBroadcastService: SocketBroadcastService,
    private readonly jobAccess: JobAccessService,
  ) {}

  @Post()
  async createInterview(
    @Body() createInterviewDTO: CreateInterviewDTO,
    @Req() req?: any,
  ): Promise<CreateInterviewResponseDTO> {
    await this.jobAccess.assertCompanyAccess(
      req?.user?.id,
      createInterviewDTO.companyId,
    );

    const createInterviewPayload = {
      ...createInterviewDTO,
      createdBy: 'company',
    };

    const result = await rpcCall<CreateInterviewResponseDTO>(
      this.jobClient,
      JOB_SERVICE.ACTIONS.CREATE_INTERVIEW,
      createInterviewPayload,
    );
    if (result.notifyUserId) {
      this.socketBroadcastService.emitToUser(
        result.notifyUserId,
        'interviewUpdate',
      );
      this.socketBroadcastService.emitToUser(
        result.notifyUserId,
        'badgeIncrement',
      );
    }
    return result;
  }

  @Get('employee/:employeeId')
  async getInterviewsByEmployee(
    @Param('employeeId', ParseUUIDPipe) employeeId: string,
    @Req() req?: any,
  ): Promise<GetInterviewResponseDTO[]> {
    await this.jobAccess.assertEmployeeAccess(req?.user?.id, employeeId);
    return rpcCall<GetInterviewResponseDTO[]>(
      this.jobClient,
      JOB_SERVICE.ACTIONS.GET_INTERVIEWS_BY_EMPLOYEE,
      { employeeId },
    );
  }

  @Get('company/:companyId')
  async getInterviewsByCompany(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Req() req?: any,
  ): Promise<GetInterviewResponseDTO[]> {
    await this.jobAccess.assertCompanyAccess(req?.user?.id, companyId);
    return rpcCall<GetInterviewResponseDTO[]>(
      this.jobClient,
      JOB_SERVICE.ACTIONS.GET_INTERVIEWS_BY_COMPANY,
      { companyId },
    );
  }

  @Patch('status')
  async updateInterviewStatus(
    @Body() updateInterviewStatusDTO: UpdateInterviewStatusDTO,
    @Req() req?: any,
  ): Promise<UpdateInterviewStatusResponseDTO> {
    if (!req?.user?.id) throw new ForbiddenException('Unauthorized request.');

    const profile = await this.jobAccess.getCurrentUserProfile(req.user.id);
    const role = profile?.role;

    if (!role || !['employee', 'company'].includes(role))
      throw new ForbiddenException('Invalid user role.');

    const updateInterviewStatusPayload = {
      ...updateInterviewStatusDTO,
      requestUserId: req.user.id,
      requestUserRole: role,
    };

    const result = await rpcCall<UpdateInterviewStatusResponseDTO>(
      this.jobClient,
      JOB_SERVICE.ACTIONS.UPDATE_INTERVIEW_STATUS,
      updateInterviewStatusPayload,
    );
    if (result.notifyUserId) {
      this.socketBroadcastService.emitToUser(
        result.notifyUserId,
        'interviewUpdate',
      );
      this.socketBroadcastService.emitToUser(
        result.notifyUserId,
        'badgeIncrement',
      );
    }
    return result;
  }
}
