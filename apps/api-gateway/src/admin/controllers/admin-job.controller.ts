import { AuthUser, User } from '@app/common/decorators/user.decorator';
import { AdminGuard } from '@app/common/guards/admin.guard';
import { AuthGuard } from '@app/common/guards/auth.guard';
import { USER_SERVICE } from '@app/contracts/constants/service-actions/user-service.constant';
import {
  AdminActionResponseDTO,
  AdminHideJobBodyDTO,
  AdminListJobsQueryDTO,
  AdminPagedJobsDTO,
} from '@app/contracts/dtos/user';
import { IAdminJobController } from '@app/contracts/interfaces/controller/user-controllers/admin-controller.interface';
import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { rpcCall } from '../../utils/rpc-call';

/**
 * Job posting moderation.
 *
 * DELETE hides and POST restores, rather than a single PATCH carrying a
 * status: hiding requires a reason in the body and restoring takes none, so
 * one endpoint would have to accept a body that is mandatory in one direction
 * and meaningless in the other.
 */
@Controller('admin/jobs')
@UseGuards(AuthGuard, AdminGuard)
export class AdminJobController implements IAdminJobController {
  constructor(
    @Inject(USER_SERVICE.NAME) private readonly userClient: ClientProxy,
  ) {}

  @Get()
  async listJobs(
    @Query() query: AdminListJobsQueryDTO,
  ): Promise<AdminPagedJobsDTO> {
    return rpcCall<AdminPagedJobsDTO>(
      this.userClient,
      USER_SERVICE.ACTIONS.ADMIN_LIST_JOBS,
      query,
      20_000,
    );
  }

  @Delete(':jobId')
  async hideJob(
    @User() user: AuthUser,
    @Param('jobId', ParseUUIDPipe) jobId: string,
    @Body() body: AdminHideJobBodyDTO,
  ): Promise<AdminActionResponseDTO> {
    // actorId comes from the verified session, never the body.
    return rpcCall<AdminActionResponseDTO>(
      this.userClient,
      USER_SERVICE.ACTIONS.ADMIN_HIDE_JOB,
      { ...body, actorId: user.id, jobId },
    );
  }

  @Post(':jobId/restore')
  async restoreJob(
    @User() user: AuthUser,
    @Param('jobId', ParseUUIDPipe) jobId: string,
  ): Promise<AdminActionResponseDTO> {
    return rpcCall<AdminActionResponseDTO>(
      this.userClient,
      USER_SERVICE.ACTIONS.ADMIN_RESTORE_JOB,
      { actorId: user.id, jobId },
    );
  }
}
