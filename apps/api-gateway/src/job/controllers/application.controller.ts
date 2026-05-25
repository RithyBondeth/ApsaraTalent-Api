import { AuthGuard } from '@app/common/guards/auth.guard';
import { JOB_SERVICE } from '@app/contracts/constants/service-actions/job-service.constant';
import {
  ApplyJobDTO,
  ApplicationResponseDTO,
  UpdateApplicationStatusDTO,
} from '@app/contracts/dtos/job';
import {
  Body,
  Controller,
  Delete,
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
import { IApplicationController } from '@app/contracts/interfaces/controller/application-controller.interface';
import { JobAccessService } from '../services/job-access.service';

@Controller('job/application')
@UseGuards(AuthGuard)
export class ApplicationController implements IApplicationController {
  constructor(
    @Inject(JOB_SERVICE.NAME) private readonly jobClient: ClientProxy,
    private readonly jobAccess: JobAccessService,
  ) {}

  @Post()
  async applyJob(
    @Body() applyJobDTO: ApplyJobDTO,
    @Req() req?: any,
  ): Promise<ApplicationResponseDTO> {
    if (!req?.user?.id) throw new ForbiddenException('Unauthorized request.');
    return rpcCall<ApplicationResponseDTO>(
      this.jobClient,
      JOB_SERVICE.ACTIONS.APPLY_JOB,
      { employeeId: req.user.id, applyJobDTO },
    );
  }

  @Get('mine')
  async getMyApplications(@Req() req?: any): Promise<ApplicationResponseDTO[]> {
    if (!req?.user?.id) throw new ForbiddenException('Unauthorized request.');
    return rpcCall<ApplicationResponseDTO[]>(
      this.jobClient,
      JOB_SERVICE.ACTIONS.GET_MY_APPLICATIONS,
      { employeeId: req.user.id },
    );
  }

  @Get('job/:jobId/company/:companyId')
  async getJobApplications(
    @Param('jobId', ParseUUIDPipe) jobId: string,
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Req() req?: any,
  ): Promise<ApplicationResponseDTO[]> {
    await this.jobAccess.assertCompanyAccess(req?.user?.id, companyId);
    return rpcCall<ApplicationResponseDTO[]>(
      this.jobClient,
      JOB_SERVICE.ACTIONS.GET_JOB_APPLICATIONS,
      { jobId, companyId },
    );
  }

  @Patch('status')
  async updateApplicationStatus(
    @Body() updateApplicationStatusDTO: UpdateApplicationStatusDTO,
    @Req() req?: any,
  ): Promise<ApplicationResponseDTO> {
    if (!req?.user?.id) throw new ForbiddenException('Unauthorized request.');
    const profile = await this.jobAccess.getCurrentUserProfile(req.user.id);
    if (profile?.role !== 'company' || !profile?.company?.id) {
      throw new ForbiddenException(
        'Only companies can update application status.',
      );
    }
    return rpcCall<ApplicationResponseDTO>(
      this.jobClient,
      JOB_SERVICE.ACTIONS.UPDATE_APPLICATION_STATUS,
      { companyId: profile.company.id, updateApplicationStatusDTO },
    );
  }

  @Delete(':applicationId')
  async withdrawApplication(
    @Param('applicationId', ParseUUIDPipe) applicationId: string,
    @Req() req?: any,
  ): Promise<{ message: string }> {
    if (!req?.user?.id) throw new ForbiddenException('Unauthorized request.');
    return rpcCall<{ message: string }>(
      this.jobClient,
      JOB_SERVICE.ACTIONS.WITHDRAW_APPLICATION,
      { employeeId: req.user.id, applicationId },
    );
  }
}
