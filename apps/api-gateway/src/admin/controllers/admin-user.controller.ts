import { AuthUser, User } from '@app/common/decorators/user.decorator';
import { AdminGuard } from '@app/common/guards/admin.guard';
import { AuthGuard } from '@app/common/guards/auth.guard';
import { USER_SERVICE } from '@app/contracts/constants/service-actions/user-service.constant';
import {
  AdminActionResponseDTO,
  AdminListUsersQueryDTO,
  AdminOverviewDTO,
  AdminPagedUsersDTO,
  AdminUpdateUserStatusBodyDTO,
  AdminUserDetailDTO,
} from '@app/contracts/dtos/user';
import { IAdminUserController } from '@app/contracts/interfaces/controller/user-controllers/admin-controller.interface';
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
 * Administrative reads and account control.
 *
 * `AuthGuard` then `AdminGuard`, in that order and on the class: AdminGuard
 * reads `request.user.role`, which only exists once AuthGuard has run. This
 * pair is the entire authorisation boundary for the admin surface — the web
 * app's middleware gates on a cookie the browser owns and is presentation
 * only, so nothing here may depend on it.
 */
@Controller('admin/users')
@UseGuards(AuthGuard, AdminGuard)
export class AdminUserController implements IAdminUserController {
  constructor(
    @Inject(USER_SERVICE.NAME) private readonly userClient: ClientProxy,
  ) {}

  @Get('overview')
  async getOverview(): Promise<AdminOverviewDTO> {
    return rpcCall<AdminOverviewDTO>(
      this.userClient,
      USER_SERVICE.ACTIONS.ADMIN_OVERVIEW,
      {},
    );
  }

  @Get()
  async listUsers(
    @Query() query: AdminListUsersQueryDTO,
  ): Promise<AdminPagedUsersDTO> {
    // Counting and searching the whole user table is heavier than the 10s
    // default, which is a timeout the operator sees rather than an error.
    return rpcCall<AdminPagedUsersDTO>(
      this.userClient,
      USER_SERVICE.ACTIONS.ADMIN_LIST_USERS,
      query,
      20_000,
    );
  }

  @Get(':userId')
  async getUser(
    @Param('userId', ParseUUIDPipe) userId: string,
  ): Promise<AdminUserDetailDTO> {
    return rpcCall<AdminUserDetailDTO>(
      this.userClient,
      USER_SERVICE.ACTIONS.ADMIN_GET_USER,
      { userId },
    );
  }

  @Patch(':userId/status')
  async updateUserStatus(
    @User() user: AuthUser,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() body: AdminUpdateUserStatusBodyDTO,
  ): Promise<AdminActionResponseDTO> {
    // actorId comes from the verified session, never from the body — a
    // caller must not be able to attribute their own action to someone else.
    return rpcCall<AdminActionResponseDTO>(
      this.userClient,
      USER_SERVICE.ACTIONS.ADMIN_UPDATE_USER_STATUS,
      { ...body, actorId: user.id, userId },
    );
  }
}
