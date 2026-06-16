import { AuthUser, User } from '@app/common/decorators/user.decorator';
import { AuthGuard } from '@app/common/guards/auth.guard';
import { USER_SERVICE } from '@app/contracts/constants/service-actions/user-service.constant';
import {
  BlockActionResponseDTO,
  BlockedUserResponseDTO,
  BlockStatusResponseDTO,
  CreateReportBodyDTO,
  ReportUserResponseDTO,
} from '@app/contracts/dtos/user';
import { IModerationController } from '@app/contracts/interfaces/controller/user-controllers/moderation-controller.interface';
import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { rpcCall } from '../../utils/rpc-call';

@Controller('user/moderation')
@UseGuards(AuthGuard)
export class ModerationController implements IModerationController {
  constructor(
    @Inject(USER_SERVICE.NAME) private readonly userClient: ClientProxy,
  ) {}

  @Post('block/:userId')
  async blockUser(
    @User() user: AuthUser,
    @Param('userId', ParseUUIDPipe) userId: string,
  ): Promise<BlockActionResponseDTO> {
    return rpcCall<BlockActionResponseDTO>(
      this.userClient,
      USER_SERVICE.ACTIONS.BLOCK_USER,
      { blockerId: user.id, blockedId: userId },
    );
  }

  @Delete('block/:userId')
  async unblockUser(
    @User() user: AuthUser,
    @Param('userId', ParseUUIDPipe) userId: string,
  ): Promise<BlockActionResponseDTO> {
    return rpcCall<BlockActionResponseDTO>(
      this.userClient,
      USER_SERVICE.ACTIONS.UNBLOCK_USER,
      { blockerId: user.id, blockedId: userId },
    );
  }

  @Get('blocked')
  async listBlockedUsers(
    @User() user: AuthUser,
  ): Promise<BlockedUserResponseDTO[]> {
    return rpcCall<BlockedUserResponseDTO[]>(
      this.userClient,
      USER_SERVICE.ACTIONS.LIST_BLOCKED_USERS,
      { blockerId: user.id },
    );
  }

  @Get('block-status/:userId')
  async getBlockStatus(
    @User() user: AuthUser,
    @Param('userId', ParseUUIDPipe) userId: string,
  ): Promise<BlockStatusResponseDTO> {
    return rpcCall<BlockStatusResponseDTO>(
      this.userClient,
      USER_SERVICE.ACTIONS.GET_BLOCK_STATUS,
      { userId: user.id, otherUserId: userId },
    );
  }

  @Get('hidden-ids')
  async getHiddenProfileIds(@User() user: AuthUser): Promise<string[]> {
    return rpcCall<string[]>(
      this.userClient,
      USER_SERVICE.ACTIONS.GET_HIDDEN_PROFILE_IDS,
      { requesterId: user.id },
    );
  }

  @Post('report')
  async reportUser(
    @User() user: AuthUser,
    @Body() body: CreateReportBodyDTO,
  ): Promise<ReportUserResponseDTO> {
    return rpcCall<ReportUserResponseDTO>(
      this.userClient,
      USER_SERVICE.ACTIONS.REPORT_USER,
      {
        reporterId: user.id,
        reportedId: body.reportedId,
        reason: body.reason,
        details: body.details,
      },
    );
  }
}
