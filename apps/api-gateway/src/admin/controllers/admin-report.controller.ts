import { AuthUser, User } from '@app/common/decorators/user.decorator';
import { AdminGuard } from '@app/common/guards/admin.guard';
import { AuthGuard } from '@app/common/guards/auth.guard';
import { USER_SERVICE } from '@app/contracts/constants/service-actions/user-service.constant';
import {
  AdminActionResponseDTO,
  AdminListAuditQueryDTO,
  AdminListReportsQueryDTO,
  AdminPagedAuditDTO,
  AdminPagedReportsDTO,
  AdminUpdateReportStatusBodyDTO,
} from '@app/contracts/dtos/user';
import { IAdminReportController } from '@app/contracts/interfaces/controller/user-controllers/admin-controller.interface';
import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { rpcCall } from '../../utils/rpc-call';

/** The report queue, and the read-only audit trail over every admin action. */
@Controller('admin')
@UseGuards(AuthGuard, AdminGuard)
export class AdminReportController implements IAdminReportController {
  constructor(
    @Inject(USER_SERVICE.NAME) private readonly userClient: ClientProxy,
  ) {}

  @Get('reports')
  async listReports(
    @Query() query: AdminListReportsQueryDTO,
  ): Promise<AdminPagedReportsDTO> {
    return rpcCall<AdminPagedReportsDTO>(
      this.userClient,
      USER_SERVICE.ACTIONS.ADMIN_LIST_REPORTS,
      query,
    );
  }

  @Patch('reports/:reportId/status')
  async updateReportStatus(
    @User() user: AuthUser,
    @Param('reportId', ParseUUIDPipe) reportId: string,
    @Body() body: AdminUpdateReportStatusBodyDTO,
  ): Promise<AdminActionResponseDTO> {
    return rpcCall<AdminActionResponseDTO>(
      this.userClient,
      USER_SERVICE.ACTIONS.ADMIN_UPDATE_REPORT_STATUS,
      { ...body, actorId: user.id, reportId },
    );
  }

  // Read-only by design: the audit log has no write endpoint, because
  // everything that belongs in it is written by the action it records.
  @Get('audit')
  async listAudit(
    @Query() query: AdminListAuditQueryDTO,
  ): Promise<AdminPagedAuditDTO> {
    return rpcCall<AdminPagedAuditDTO>(
      this.userClient,
      USER_SERVICE.ACTIONS.ADMIN_LIST_AUDIT,
      query,
    );
  }
}
