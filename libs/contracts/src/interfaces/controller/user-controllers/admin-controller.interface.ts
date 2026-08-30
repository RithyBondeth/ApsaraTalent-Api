import { AuthUser } from '@app/common/decorators/user.decorator';
import {
  AdminActionResponseDTO,
  AdminGetUserDTO,
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
