import { AuthUser, User } from '@app/common/decorators/user.decorator';
import { AuthGuard } from '@app/common/guards/auth.guard';
import { USER_SERVICE } from '@app/contracts/constants/service-actions/user-service.constant';
import {
  ProfileAnalyticsResponseDTO,
  UpdatePrivacyDTO,
  UpdatePrivacyResponseDTO,
} from '@app/contracts';
import {
  Body,
  Controller,
  Get,
  Inject,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { rpcCall } from '../../utils/rpc-call';

/**
 * The signed-in user's own analytics read + privacy toggle. Deliberately
 * scoped to `me` — nobody looks at another account's viewers.
 */
@Controller('user/me')
@UseGuards(AuthGuard)
export class ProfileAnalyticsController {
  constructor(
    @Inject(USER_SERVICE.NAME) private readonly userClient: ClientProxy,
  ) {}

  @Get('profile-analytics')
  async getMyProfileAnalytics(
    @User() user: AuthUser,
  ): Promise<ProfileAnalyticsResponseDTO> {
    return rpcCall<ProfileAnalyticsResponseDTO>(
      this.userClient,
      USER_SERVICE.ACTIONS.GET_MY_PROFILE_ANALYTICS,
      { userId: user.id },
    );
  }

  @Patch('privacy')
  async updatePrivacySettings(
    @User() user: AuthUser,
    @Body() dto: UpdatePrivacyDTO,
  ): Promise<UpdatePrivacyResponseDTO> {
    return rpcCall<UpdatePrivacyResponseDTO>(
      this.userClient,
      USER_SERVICE.ACTIONS.UPDATE_PRIVACY_SETTINGS,
      { userId: user.id, dto },
    );
  }
}
