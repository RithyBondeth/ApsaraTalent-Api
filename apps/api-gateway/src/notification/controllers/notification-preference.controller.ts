import { AuthUser, User } from '@app/common/decorators/user.decorator';
import { AuthGuard } from '@app/common/guards/auth.guard';
import { NOTIFICATION_SERVICE } from '@app/contracts/constants/service-actions/notification-service.constant';
import {
  NotificationPreferenceResponseDTO,
  UnsubscribeBodyDTO,
  UnsubscribeResponseDTO,
  UpdateNotificationPreferenceBodyDTO,
} from '@app/contracts/dtos/notification';
import {
  Body,
  Controller,
  Get,
  Inject,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { Throttle } from '@nestjs/throttler';
import { rpcCall } from '../../utils/rpc-call';

@Controller('notification/preferences')
export class NotificationPreferenceController {
  constructor(
    @Inject(NOTIFICATION_SERVICE.NAME)
    private readonly notificationClient: ClientProxy,
  ) {}

  @Get()
  @UseGuards(AuthGuard)
  async getPreferences(
    @User() user: AuthUser,
  ): Promise<NotificationPreferenceResponseDTO> {
    return rpcCall<NotificationPreferenceResponseDTO>(
      this.notificationClient,
      NOTIFICATION_SERVICE.ACTIONS.GET_PREFERENCES,
      { userId: user.id },
    );
  }

  @Patch()
  @UseGuards(AuthGuard)
  async updatePreferences(
    @User() user: AuthUser,
    @Body() body: UpdateNotificationPreferenceBodyDTO,
  ): Promise<NotificationPreferenceResponseDTO> {
    return rpcCall<NotificationPreferenceResponseDTO>(
      this.notificationClient,
      NOTIFICATION_SERVICE.ACTIONS.UPDATE_PREFERENCES,
      {
        userId: user.id,
        emailEnabled: body.emailEnabled,
        pushEnabled: body.pushEnabled,
        categories: body.categories,
      },
    );
  }

  /**
   * One-click unsubscribe, reached from an email footer without a session.
   *
   * POST rather than GET, and that is not a style choice. Corporate mail
   * scanners and link-preview bots fetch every URL in an incoming message; a
   * GET unsubscribe would opt people out of their own notifications before
   * they had read the email. RFC 8058 specifies POST for the same reason. The
   * link in the footer points at a page on the web app, which posts here.
   *
   * Unauthenticated, so it is throttled hard: the token is the only credential
   * and there is nothing else standing between a guesser and someone's inbox
   * settings. It can only ever turn email off.
   */
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('unsubscribe')
  async unsubscribe(
    @Body() body: UnsubscribeBodyDTO,
  ): Promise<UnsubscribeResponseDTO> {
    return rpcCall<UnsubscribeResponseDTO>(
      this.notificationClient,
      NOTIFICATION_SERVICE.ACTIONS.UNSUBSCRIBE,
      { token: body.token },
    );
  }
}
