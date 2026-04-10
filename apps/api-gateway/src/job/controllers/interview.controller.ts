import { AuthGuard } from '@app/common/guards/auth.guard';
import { JOB_SERVICE } from '@app/contracts/constants/service-actions/job-service.constant';
import { USER_SERVICE } from '@app/contracts/constants/service-actions/user-service.constant';
import { IInterviewController } from '@app/contracts/interfaces/controller/job-controller.interface';
import {
  CreateInterviewDto,
  UpdateInterviewStatusDto,
} from 'apps/job-service/src/dtos/interview.dto';
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
import { firstValueFrom } from 'rxjs';
import { JobAccessBase } from '../shared/job-access.base';

@Controller('match/interview')
@UseGuards(AuthGuard)
export class InterviewController extends JobAccessBase implements IInterviewController {
  constructor(
    @Inject(JOB_SERVICE.NAME) private readonly jobClient: ClientProxy,
    @Inject(USER_SERVICE.NAME) userClient: ClientProxy,
  ) {
    super(userClient);
  }

  @Post()
  async createInterview(@Body() dto: CreateInterviewDto, @Req() req?: any) {
    await this.assertCompanyAccess(req?.user?.id, dto.companyId);

    return firstValueFrom(
      this.jobClient.send(JOB_SERVICE.ACTIONS.CREATE_INTERVIEW, {
        ...dto,
        createdBy: 'company',
      }),
    );
  }

  @Get('employee/:employeeId')
  async getInterviewsByEmployee(
    @Param('employeeId', ParseUUIDPipe) employeeId: string,
    @Req() req?: any,
  ) {
    await this.assertEmployeeAccess(req?.user?.id, employeeId);

    return firstValueFrom(
      this.jobClient.send(JOB_SERVICE.ACTIONS.GET_INTERVIEWS_BY_EMPLOYEE, {
        employeeId,
      }),
    );
  }

  @Get('company/:companyId')
  async getInterviewsByCompany(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Req() req?: any,
  ) {
    await this.assertCompanyAccess(req?.user?.id, companyId);

    return firstValueFrom(
      this.jobClient.send(JOB_SERVICE.ACTIONS.GET_INTERVIEWS_BY_COMPANY, {
        companyId,
      }),
    );
  }

  @Patch('status')
  async updateInterviewStatus(
    @Body() dto: UpdateInterviewStatusDto,
    @Req() req?: any,
  ) {
    if (!req?.user?.id) {
      throw new ForbiddenException('Unauthorized request.');
    }

    const profile = await this.getCurrentUserProfile(req.user.id);
    const role = profile?.role;

    if (!role || !['employee', 'company'].includes(role)) {
      throw new ForbiddenException('Invalid user role.');
    }

    return firstValueFrom(
      this.jobClient.send(JOB_SERVICE.ACTIONS.UPDATE_INTERVIEW_STATUS, {
        ...dto,
        requestUserId: req.user.id,
        requestUserRole: role,
      }),
    );
  }
}
