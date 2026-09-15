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

export interface IApplicationController {
  applyApplication(
    applyApplicationDTO: ApplyApplicationDTO,
    req?: any,
  ): Promise<ApplyApplicationResponseDTO>;
  getMyApplications(req?: any): Promise<GetApplicationResponseDTO[]>;
  getJobApplications(
    jobId: string,
    companyId: string,
    req?: any,
  ): Promise<GetApplicationResponseDTO[]>;
  updateApplicationStatus(
    updateApplicationStatusDTO: UpdateApplicationStatusDTO,
    req?: any,
  ): Promise<UpdateApplicationStatusResponseDTO>;
  withdrawApplication(
    applicationId: string,
    req?: any,
  ): Promise<{ message: string }>;
  bulkUpdateApplicationStatus(
    bulkUpdateApplicationStatusDTO: BulkUpdateApplicationStatusDTO,
    req?: any,
  ): Promise<BulkUpdateApplicationStatusResponseDTO>;
  getJobPipeline(
    jobId: string,
    companyId: string,
    req?: any,
  ): Promise<JobPipelineResponseDTO>;
  createApplicationNote(
    applicationId: string,
    createApplicationNoteDTO: CreateApplicationNoteDTO,
    req?: any,
  ): Promise<ApplicationNoteResponseDTO>;
  listApplicationNotes(
    applicationId: string,
    req?: any,
  ): Promise<ApplicationNoteResponseDTO[]>;
  deleteApplicationNote(
    applicationId: string,
    noteId: string,
    req?: any,
  ): Promise<{ message: string }>;
  listApplicationStatusHistory(
    applicationId: string,
    req?: any,
  ): Promise<ApplicationStatusHistoryEntryDTO[]>;
}

export interface IApplicationRpcController {
  applyApplication(
    employeeId: string,
    applyApplicationDTO: ApplyApplicationDTO,
  ): Promise<ApplyApplicationResponseDTO>;
  getMyApplications(employeeId: string): Promise<GetApplicationResponseDTO[]>;
  getJobApplications(
    jobId: string,
    companyId: string,
  ): Promise<GetApplicationResponseDTO[]>;
  updateApplicationStatus(
    companyId: string,
    updateApplicationStatusDTO: UpdateApplicationStatusDTO,
  ): Promise<UpdateApplicationStatusResponseDTO>;
  withdrawApplication(
    employeeId: string,
    applicationId: string,
  ): Promise<{ message: string }>;
  bulkUpdateApplicationStatus(
    companyId: string,
    bulkUpdateApplicationStatusDTO: BulkUpdateApplicationStatusDTO,
  ): Promise<BulkUpdateApplicationStatusResponseDTO>;
  getJobPipeline(
    jobId: string,
    companyId: string,
  ): Promise<JobPipelineResponseDTO>;
  createApplicationNote(
    companyId: string,
    applicationId: string,
    createApplicationNoteDTO: CreateApplicationNoteDTO,
    authorUserId: string,
  ): Promise<ApplicationNoteResponseDTO>;
  listApplicationNotes(
    companyId: string,
    applicationId: string,
  ): Promise<ApplicationNoteResponseDTO[]>;
  deleteApplicationNote(
    companyId: string,
    applicationId: string,
    noteId: string,
  ): Promise<{ message: string }>;
  listApplicationStatusHistory(
    companyId: string,
    applicationId: string,
  ): Promise<ApplicationStatusHistoryEntryDTO[]>;
}
