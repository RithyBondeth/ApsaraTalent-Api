import { AuthUser } from '@app/common/decorators/user.decorator';
import {
  AdminActionResponseDTO,
  AdminGetUserDTO,
  AdminHideJobBodyDTO,
  AdminHideJobDTO,
  AdminListJobsDTO,
  AdminListJobsQueryDTO,
  AdminPagedJobsDTO,
  AdminRestoreJobDTO,
  AdminListAuditDTO,
  AdminListAuditQueryDTO,
  AdminListReportsDTO,
  AdminListReportsQueryDTO,
  AdminListUsersDTO,
  AdminListUsersQueryDTO,
  AdminOverviewDTO,
  AdminPagedAuditDTO,
  AdminPagedReportsDTO,
  AdminPagedUsersDTO,
  AdminUpdateReportStatusBodyDTO,
  AdminUpdateReportStatusDTO,
  AdminUpdateUserStatusBodyDTO,
  AdminUpdateUserStatusDTO,
  AdminUserDetailDTO,
} from '@app/contracts/dtos/user';

// Internal TCP controller (user-service)
export interface IAdminRpcController {
  getOverview(): Promise<AdminOverviewDTO>;
  listUsers(adminListUsersDTO: AdminListUsersDTO): Promise<AdminPagedUsersDTO>;
  getUser(adminGetUserDTO: AdminGetUserDTO): Promise<AdminUserDetailDTO>;
  updateUserStatus(
    adminUpdateUserStatusDTO: AdminUpdateUserStatusDTO,
  ): Promise<AdminActionResponseDTO>;
  listReports(
    adminListReportsDTO: AdminListReportsDTO,
  ): Promise<AdminPagedReportsDTO>;
  updateReportStatus(
    adminUpdateReportStatusDTO: AdminUpdateReportStatusDTO,
  ): Promise<AdminActionResponseDTO>;
  listAudit(adminListAuditDTO: AdminListAuditDTO): Promise<AdminPagedAuditDTO>;
  listJobs(adminListJobsDTO: AdminListJobsDTO): Promise<AdminPagedJobsDTO>;
  hideJob(adminHideJobDTO: AdminHideJobDTO): Promise<AdminActionResponseDTO>;
  restoreJob(
    adminRestoreJobDTO: AdminRestoreJobDTO,
  ): Promise<AdminActionResponseDTO>;
}

// HTTP controllers (api-gateway)
export interface IAdminUserController {
  getOverview(): Promise<AdminOverviewDTO>;
  listUsers(query: AdminListUsersQueryDTO): Promise<AdminPagedUsersDTO>;
  getUser(userId: string): Promise<AdminUserDetailDTO>;
  updateUserStatus(
    user: AuthUser,
    userId: string,
    body: AdminUpdateUserStatusBodyDTO,
  ): Promise<AdminActionResponseDTO>;
}

export interface IAdminReportController {
  listReports(query: AdminListReportsQueryDTO): Promise<AdminPagedReportsDTO>;
  updateReportStatus(
    user: AuthUser,
    reportId: string,
    body: AdminUpdateReportStatusBodyDTO,
  ): Promise<AdminActionResponseDTO>;
  listAudit(query: AdminListAuditQueryDTO): Promise<AdminPagedAuditDTO>;
}

export interface IAdminJobController {
  listJobs(query: AdminListJobsQueryDTO): Promise<AdminPagedJobsDTO>;
  hideJob(
    user: AuthUser,
    jobId: string,
    body: AdminHideJobBodyDTO,
  ): Promise<AdminActionResponseDTO>;
  restoreJob(user: AuthUser, jobId: string): Promise<AdminActionResponseDTO>;
}
