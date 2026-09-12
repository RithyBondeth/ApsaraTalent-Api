import { AuthUser, User } from '@app/common/decorators/user.decorator';
import { AdminGuard } from '@app/common/guards/admin.guard';
import { AuthGuard } from '@app/common/guards/auth.guard';
import { USER_SERVICE } from '@app/contracts/constants/service-actions/user-service.constant';
import {
  AdminActionResponseDTO,
  AdminListProblemReportsQueryDTO,
  AdminPagedProblemReportsDTO,
  AdminUpdateProblemReportStatusBodyDTO,
} from '@app/contracts/dtos/user';
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

/**
 * The problem-report queue: what the support form writes to.
 *
 * Separate from `AdminReportController` (user-on-user moderation) because the
 * two share nothing but the word "report" — see `AdminProblemReportService`
 * for the reasoning. `/admin/problem-reports` keeps the URL honest about
 * which it is.
 */
@Controller('admin/problem-reports')
@UseGuards(AuthGuard, AdminGuard)
export class AdminProblemReportController {
  constructor(
    @Inject(USER_SERVICE.NAME) private readonly userClient: ClientProxy,
  ) {}

  @Get()
  async listReports(
    @Query() query: AdminListProblemReportsQueryDTO,
  ): Promise<AdminPagedProblemReportsDTO> {
    return rpcCall<AdminPagedProblemReportsDTO>(
      this.userClient,
      USER_SERVICE.ACTIONS.ADMIN_LIST_PROBLEM_REPORTS,
      query,
    );
  }

  @Patch(':reportId/status')
  async updateStatus(
    @User() user: AuthUser,
    @Param('reportId', ParseUUIDPipe) reportId: string,
    @Body() body: AdminUpdateProblemReportStatusBodyDTO,
  ): Promise<AdminActionResponseDTO> {
    return rpcCall<AdminActionResponseDTO>(
      this.userClient,
      USER_SERVICE.ACTIONS.ADMIN_UPDATE_PROBLEM_REPORT_STATUS,
      { ...body, actorId: user.id, reportId },
    );
  }
}
