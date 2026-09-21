import { USER_SERVICE } from '@app/contracts/constants/service-actions/user-service.constant';
import {
  AdminActionResponseDTO,
  AdminGetUserDTO,
  AdminHideJobDTO,
  AdminListJobsDTO,
  AdminPagedJobsDTO,
  AdminRestoreJobDTO,
  AdminListAuditDTO,
  AdminListReportsDTO,
  AdminListUsersDTO,
  AdminListProblemReportsDTO,
  AdminOverviewDTO,
  AdminPagedAuditDTO,
  AdminPagedProblemReportsDTO,
  AdminPagedReportsDTO,
  AdminPagedUsersDTO,
  AdminUpdateProblemReportStatusDTO,
  AdminUpdateReportStatusDTO,
  AdminUpdateUserStatusDTO,
  AdminUserDetailDTO,
} from '@app/contracts/dtos/user';
import { IAdminRpcController } from '@app/contracts/interfaces/controller/user-controllers/admin-controller.interface';
import * as userServiceInterface from '@app/contracts/interfaces/service/user-service.interface';
import { Controller, Inject } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';

/**
 * One RPC controller over both admin services. The split that matters is
 * between the services; a second controller would only duplicate the wiring.
 *
 * Nothing here checks that the caller is an administrator — this is the TCP
 * surface, which is not reachable from the internet. `AdminGuard` on the
 * gateway is the authorisation boundary.
 */
@Controller()
export class AdminController implements IAdminRpcController {
  constructor(
    @Inject(userServiceInterface.I_ADMIN_USER_SERVICE)
    private readonly adminUserService: userServiceInterface.IAdminUserService,
    @Inject(userServiceInterface.I_ADMIN_REPORT_SERVICE)
    private readonly adminReportService: userServiceInterface.IAdminReportService,
    @Inject(userServiceInterface.I_ADMIN_JOB_SERVICE)
    private readonly adminJobService: userServiceInterface.IAdminJobService,
    @Inject(userServiceInterface.I_ADMIN_PROBLEM_REPORT_SERVICE)
    private readonly adminProblemReportService: userServiceInterface.IAdminProblemReportService,
  ) {}

  @MessagePattern(USER_SERVICE.ACTIONS.ADMIN_OVERVIEW)
  async getOverview(): Promise<AdminOverviewDTO> {
    return this.adminUserService.getOverview();
  }

  @MessagePattern(USER_SERVICE.ACTIONS.ADMIN_LIST_USERS)
  async listUsers(
    @Payload() adminListUsersDTO: AdminListUsersDTO,
  ): Promise<AdminPagedUsersDTO> {
    return this.adminUserService.listUsers(adminListUsersDTO);
  }

  @MessagePattern(USER_SERVICE.ACTIONS.ADMIN_GET_USER)
  async getUser(
    @Payload() adminGetUserDTO: AdminGetUserDTO,
  ): Promise<AdminUserDetailDTO> {
    return this.adminUserService.getUser(adminGetUserDTO);
  }

  @MessagePattern(USER_SERVICE.ACTIONS.ADMIN_UPDATE_USER_STATUS)
  async updateUserStatus(
    @Payload() adminUpdateUserStatusDTO: AdminUpdateUserStatusDTO,
  ): Promise<AdminActionResponseDTO> {
    return this.adminUserService.updateUserStatus(adminUpdateUserStatusDTO);
  }

  @MessagePattern(USER_SERVICE.ACTIONS.ADMIN_LIST_REPORTS)
  async listReports(
    @Payload() adminListReportsDTO: AdminListReportsDTO,
  ): Promise<AdminPagedReportsDTO> {
    return this.adminReportService.listReports(adminListReportsDTO);
  }

  @MessagePattern(USER_SERVICE.ACTIONS.ADMIN_UPDATE_REPORT_STATUS)
  async updateReportStatus(
    @Payload() adminUpdateReportStatusDTO: AdminUpdateReportStatusDTO,
  ): Promise<AdminActionResponseDTO> {
    return this.adminReportService.updateReportStatus(
      adminUpdateReportStatusDTO,
    );
  }

  @MessagePattern(USER_SERVICE.ACTIONS.ADMIN_LIST_AUDIT)
  async listAudit(
    @Payload() adminListAuditDTO: AdminListAuditDTO,
  ): Promise<AdminPagedAuditDTO> {
    return this.adminReportService.listAudit(adminListAuditDTO);
  }

  @MessagePattern(USER_SERVICE.ACTIONS.ADMIN_LIST_JOBS)
  async listJobs(
    @Payload() adminListJobsDTO: AdminListJobsDTO,
  ): Promise<AdminPagedJobsDTO> {
    return this.adminJobService.listJobs(adminListJobsDTO);
  }

  @MessagePattern(USER_SERVICE.ACTIONS.ADMIN_HIDE_JOB)
  async hideJob(
    @Payload() adminHideJobDTO: AdminHideJobDTO,
  ): Promise<AdminActionResponseDTO> {
    return this.adminJobService.hideJob(adminHideJobDTO);
  }

  @MessagePattern(USER_SERVICE.ACTIONS.ADMIN_RESTORE_JOB)
  async restoreJob(
    @Payload() adminRestoreJobDTO: AdminRestoreJobDTO,
  ): Promise<AdminActionResponseDTO> {
    return this.adminJobService.restoreJob(adminRestoreJobDTO);
  }

  @MessagePattern(USER_SERVICE.ACTIONS.ADMIN_LIST_PROBLEM_REPORTS)
  async listProblemReports(
    @Payload() dto: AdminListProblemReportsDTO,
  ): Promise<AdminPagedProblemReportsDTO> {
    return this.adminProblemReportService.listReports(dto);
  }

  @MessagePattern(USER_SERVICE.ACTIONS.ADMIN_UPDATE_PROBLEM_REPORT_STATUS)
  async updateProblemReportStatus(
    @Payload() dto: AdminUpdateProblemReportStatusDTO,
  ): Promise<AdminActionResponseDTO> {
    return this.adminProblemReportService.updateStatus(dto);
  }
}
