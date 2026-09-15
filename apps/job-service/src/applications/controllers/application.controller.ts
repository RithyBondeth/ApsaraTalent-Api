import { Controller, Inject } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { JOB_SERVICE } from '@app/contracts/constants/service-actions/job-service.constant';
import { IApplicationRpcController } from '@app/contracts/interfaces/controller/job-controllers/application-controller.interface';
import {
  ApplicationNoteResponseDTO,
  ApplicationStatusHistoryEntryDTO,
  ApplyApplicationDTO,
  ApplyApplicationResponseDTO,
  BulkUpdateApplicationStatusDTO,
  BulkUpdateApplicationStatusResponseDTO,
  CreateApplicationNoteDTO,
  GetApplicationResponseDTO,
  I_APPLICATION_SERVICE,
  IApplicationService,
  JobPipelineResponseDTO,
  UpdateApplicationStatusDTO,
  UpdateApplicationStatusResponseDTO,
} from '@app/contracts';

@Controller()
export class ApplicationController implements IApplicationRpcController {
  constructor(
    @Inject(I_APPLICATION_SERVICE)
    private readonly applicationService: IApplicationService,
  ) {}

  @MessagePattern(JOB_SERVICE.ACTIONS.APPLY_JOB)
  applyApplication(
    @Payload('employeeId') employeeId: string,
    @Payload('applyApplicationDTO') applyApplicationDTO: ApplyApplicationDTO,
  ): Promise<ApplyApplicationResponseDTO> {
    return this.applicationService.applyApplication(
      employeeId,
      applyApplicationDTO,
    );
  }

  @MessagePattern(JOB_SERVICE.ACTIONS.GET_MY_APPLICATIONS)
  getMyApplications(
    @Payload('employeeId') employeeId: string,
  ): Promise<GetApplicationResponseDTO[]> {
    return this.applicationService.getMyApplications(employeeId);
  }

  @MessagePattern(JOB_SERVICE.ACTIONS.GET_JOB_APPLICATIONS)
  getJobApplications(
    @Payload('jobId') jobId: string,
    @Payload('companyId') companyId: string,
  ): Promise<GetApplicationResponseDTO[]> {
    return this.applicationService.getJobApplications(jobId, companyId);
  }

  @MessagePattern(JOB_SERVICE.ACTIONS.UPDATE_APPLICATION_STATUS)
  updateApplicationStatus(
    @Payload('companyId') companyId: string,
    @Payload('updateApplicationStatusDTO')
    updateApplicationStatusDTO: UpdateApplicationStatusDTO,
  ): Promise<UpdateApplicationStatusResponseDTO> {
    return this.applicationService.updateApplicationStatus(
      companyId,
      updateApplicationStatusDTO,
    );
  }

  @MessagePattern(JOB_SERVICE.ACTIONS.WITHDRAW_APPLICATION)
  withdrawApplication(
    @Payload('employeeId') employeeId: string,
    @Payload('applicationId') applicationId: string,
  ): Promise<{ message: string }> {
    return this.applicationService.withdrawApplication(
      employeeId,
      applicationId,
    );
  }

  @MessagePattern(JOB_SERVICE.ACTIONS.BULK_UPDATE_APPLICATION_STATUS)
  bulkUpdateApplicationStatus(
    @Payload('companyId') companyId: string,
    @Payload('bulkUpdateApplicationStatusDTO')
    bulkUpdateApplicationStatusDTO: BulkUpdateApplicationStatusDTO,
  ): Promise<BulkUpdateApplicationStatusResponseDTO> {
    return this.applicationService.bulkUpdateApplicationStatus(
      companyId,
      bulkUpdateApplicationStatusDTO,
    );
  }

  @MessagePattern(JOB_SERVICE.ACTIONS.GET_JOB_PIPELINE)
  getJobPipeline(
    @Payload('jobId') jobId: string,
    @Payload('companyId') companyId: string,
  ): Promise<JobPipelineResponseDTO> {
    return this.applicationService.getJobPipeline(jobId, companyId);
  }

  @MessagePattern(JOB_SERVICE.ACTIONS.CREATE_APPLICATION_NOTE)
  createApplicationNote(
    @Payload('companyId') companyId: string,
    @Payload('applicationId') applicationId: string,
    @Payload('createApplicationNoteDTO')
    createApplicationNoteDTO: CreateApplicationNoteDTO,
    @Payload('authorUserId') authorUserId: string,
  ): Promise<ApplicationNoteResponseDTO> {
    return this.applicationService.createApplicationNote(
      companyId,
      applicationId,
      createApplicationNoteDTO,
      authorUserId,
    );
  }

  @MessagePattern(JOB_SERVICE.ACTIONS.LIST_APPLICATION_NOTES)
  listApplicationNotes(
    @Payload('companyId') companyId: string,
    @Payload('applicationId') applicationId: string,
  ): Promise<ApplicationNoteResponseDTO[]> {
    return this.applicationService.listApplicationNotes(
      companyId,
      applicationId,
    );
  }

  @MessagePattern(JOB_SERVICE.ACTIONS.DELETE_APPLICATION_NOTE)
  deleteApplicationNote(
    @Payload('companyId') companyId: string,
    @Payload('applicationId') applicationId: string,
    @Payload('noteId') noteId: string,
  ): Promise<{ message: string }> {
    return this.applicationService.deleteApplicationNote(
      companyId,
      applicationId,
      noteId,
    );
  }

  @MessagePattern(JOB_SERVICE.ACTIONS.LIST_APPLICATION_STATUS_HISTORY)
  listApplicationStatusHistory(
    @Payload('companyId') companyId: string,
    @Payload('applicationId') applicationId: string,
  ): Promise<ApplicationStatusHistoryEntryDTO[]> {
    return this.applicationService.listApplicationStatusHistory(
      companyId,
      applicationId,
    );
  }
}
