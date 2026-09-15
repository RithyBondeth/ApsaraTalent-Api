import { AuthGuard } from '@app/common/guards/auth.guard';
import { JOB_SERVICE } from '@app/contracts/constants/service-actions/job-service.constant';
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
import { IApplicationController } from '@app/contracts/interfaces/controller/job-controllers/application-controller.interface';
import { JobAccessService } from '../services/job-access.service';
import {
  ApplicationNoteResponseDTO,
  ApplicationStatusHistoryEntryDTO,
  ApplyApplicationDTO,
  ApplyApplicationResponseDTO,
  BulkUpdateApplicationStatusDTO,
  BulkUpdateApplicationStatusResponseDTO,
  CreateApplicationNoteDTO,
  GetApplicationResponseDTO,
  JobPipelineResponseDTO,
  UpdateApplicationStatusDTO,
  UpdateApplicationStatusResponseDTO,
} from '@app/contracts';

@Controller('job/application')
@UseGuards(AuthGuard)
export class ApplicationController implements IApplicationController {
  constructor(
    @Inject(JOB_SERVICE.NAME) private readonly jobClient: ClientProxy,
    private readonly jobAccess: JobAccessService,
  ) {}

  @Post()
  async applyApplication(
    @Body() applyApplicationDTO: ApplyApplicationDTO,
    @Req() req?: any,
  ): Promise<ApplyApplicationResponseDTO> {
    if (!req?.user?.id) throw new ForbiddenException('Unauthorized request.');
    return rpcCall<ApplyApplicationResponseDTO>(
      this.jobClient,
      JOB_SERVICE.ACTIONS.APPLY_JOB,
      { employeeId: req.user.id, applyApplicationDTO },
    );
  }

  @Get('mine')
  async getMyApplications(
    @Req() req?: any,
  ): Promise<GetApplicationResponseDTO[]> {
    if (!req?.user?.id) throw new ForbiddenException('Unauthorized request.');
    return rpcCall<GetApplicationResponseDTO[]>(
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
  ): Promise<GetApplicationResponseDTO[]> {
    await this.jobAccess.assertCompanyAccess(req?.user?.id, companyId);
    return rpcCall<GetApplicationResponseDTO[]>(
      this.jobClient,
      JOB_SERVICE.ACTIONS.GET_JOB_APPLICATIONS,
      { jobId, companyId },
    );
  }

  @Patch('status')
  async updateApplicationStatus(
    @Body() updateApplicationStatusDTO: UpdateApplicationStatusDTO,
    @Req() req?: any,
  ): Promise<UpdateApplicationStatusResponseDTO> {
    if (!req?.user?.id) throw new ForbiddenException('Unauthorized request.');
    const profile = await this.jobAccess.getCurrentUserProfile(req.user.id);
    if (profile?.role !== 'company' || !profile?.company?.id) {
      throw new ForbiddenException(
        'Only companies can update application status.',
      );
    }
    return rpcCall<UpdateApplicationStatusResponseDTO>(
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

  /**
   * Company-only. Moves many applications to the same stage in one request;
   * per-row failures are returned in the response body, not thrown, so a
   * mixed selection still updates the rows it can.
   */
  @Patch('bulk-status')
  async bulkUpdateApplicationStatus(
    @Body() bulkUpdateApplicationStatusDTO: BulkUpdateApplicationStatusDTO,
    @Req() req?: any,
  ): Promise<BulkUpdateApplicationStatusResponseDTO> {
    if (!req?.user?.id) throw new ForbiddenException('Unauthorized request.');
    const profile = await this.jobAccess.getCurrentUserProfile(req.user.id);
    if (profile?.role !== 'company' || !profile?.company?.id) {
      throw new ForbiddenException(
        'Only companies can update application status.',
      );
    }
    return rpcCall<BulkUpdateApplicationStatusResponseDTO>(
      this.jobClient,
      JOB_SERVICE.ACTIONS.BULK_UPDATE_APPLICATION_STATUS,
      {
        companyId: profile.company.id,
        bulkUpdateApplicationStatusDTO,
      },
    );
  }

  /**
   * Kanban read for one job. Same access rule as the flat applicant list.
   */
  @Get('pipeline/job/:jobId/company/:companyId')
  async getJobPipeline(
    @Param('jobId', ParseUUIDPipe) jobId: string,
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Req() req?: any,
  ): Promise<JobPipelineResponseDTO> {
    await this.jobAccess.assertCompanyAccess(req?.user?.id, companyId);
    return rpcCall<JobPipelineResponseDTO>(
      this.jobClient,
      JOB_SERVICE.ACTIONS.GET_JOB_PIPELINE,
      { jobId, companyId },
    );
  }

  @Post(':applicationId/notes')
  async createApplicationNote(
    @Param('applicationId', ParseUUIDPipe) applicationId: string,
    @Body() createApplicationNoteDTO: CreateApplicationNoteDTO,
    @Req() req?: any,
  ): Promise<ApplicationNoteResponseDTO> {
    if (!req?.user?.id) throw new ForbiddenException('Unauthorized request.');
    const profile = await this.jobAccess.getCurrentUserProfile(req.user.id);
    if (profile?.role !== 'company' || !profile?.company?.id) {
      throw new ForbiddenException(
        'Only companies can leave notes on applications.',
      );
    }
    return rpcCall<ApplicationNoteResponseDTO>(
      this.jobClient,
      JOB_SERVICE.ACTIONS.CREATE_APPLICATION_NOTE,
      {
        companyId: profile.company.id,
        applicationId,
        createApplicationNoteDTO,
        authorUserId: req.user.id,
      },
    );
  }

  @Get(':applicationId/notes')
  async listApplicationNotes(
    @Param('applicationId', ParseUUIDPipe) applicationId: string,
    @Req() req?: any,
  ): Promise<ApplicationNoteResponseDTO[]> {
    if (!req?.user?.id) throw new ForbiddenException('Unauthorized request.');
    const profile = await this.jobAccess.getCurrentUserProfile(req.user.id);
    if (profile?.role !== 'company' || !profile?.company?.id) {
      throw new ForbiddenException(
        'Only companies can read notes on applications.',
      );
    }
    return rpcCall<ApplicationNoteResponseDTO[]>(
      this.jobClient,
      JOB_SERVICE.ACTIONS.LIST_APPLICATION_NOTES,
      { companyId: profile.company.id, applicationId },
    );
  }

  @Delete(':applicationId/notes/:noteId')
  async deleteApplicationNote(
    @Param('applicationId', ParseUUIDPipe) applicationId: string,
    @Param('noteId', ParseUUIDPipe) noteId: string,
    @Req() req?: any,
  ): Promise<{ message: string }> {
    if (!req?.user?.id) throw new ForbiddenException('Unauthorized request.');
    const profile = await this.jobAccess.getCurrentUserProfile(req.user.id);
    if (profile?.role !== 'company' || !profile?.company?.id) {
      throw new ForbiddenException(
        'Only companies can delete notes on applications.',
      );
    }
    return rpcCall<{ message: string }>(
      this.jobClient,
      JOB_SERVICE.ACTIONS.DELETE_APPLICATION_NOTE,
      { companyId: profile.company.id, applicationId, noteId },
    );
  }

  @Get(':applicationId/history')
  async listApplicationStatusHistory(
    @Param('applicationId', ParseUUIDPipe) applicationId: string,
    @Req() req?: any,
  ): Promise<ApplicationStatusHistoryEntryDTO[]> {
    if (!req?.user?.id) throw new ForbiddenException('Unauthorized request.');
    const profile = await this.jobAccess.getCurrentUserProfile(req.user.id);
    if (profile?.role !== 'company' || !profile?.company?.id) {
      throw new ForbiddenException(
        'Only companies can read application history.',
      );
    }
    return rpcCall<ApplicationStatusHistoryEntryDTO[]>(
      this.jobClient,
      JOB_SERVICE.ACTIONS.LIST_APPLICATION_STATUS_HISTORY,
      { companyId: profile.company.id, applicationId },
    );
  }
}
