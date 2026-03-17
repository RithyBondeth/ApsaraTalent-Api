import { AuthGuard } from '@app/common/guards/auth.guard';
import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { NOTIFICATION_SERVICE } from 'utils/constants/notification.constant';

@Controller('notification')
export class NotificationController {
  constructor(
    @Inject(NOTIFICATION_SERVICE.NAME)
    private readonly notificationClient: ClientProxy,
  ) {}

  @Get('all')
  async getAllNotification(): Promise<any> {
    return firstValueFrom(
      this.notificationClient.send(
        NOTIFICATION_SERVICE.ACTIONS.FIND_ALL_NOTIFICATIONS,
        {},
      ),
    );
  }

  @Get()
  @UseGuards(AuthGuard)
  async listByUser(
    @Req() req,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('unreadOnly') unreadOnly?: string,
  ) {
    return firstValueFrom(
      this.notificationClient.send(
        NOTIFICATION_SERVICE.ACTIONS.LIST_BY_USER,
        {
          userId: req.user.id,
          page: page ? Number(page) : undefined,
          limit: limit ? Number(limit) : undefined,
          unreadOnly: unreadOnly === 'true',
        },
      ),
    );
  }

  @Get('unread-count')
  @UseGuards(AuthGuard)
  async getUnreadCount(@Req() req) {
    return firstValueFrom(
      this.notificationClient.send(
        NOTIFICATION_SERVICE.ACTIONS.GET_UNREAD_COUNT,
        { userId: req.user.id },
      ),
    );
  }

  @Patch(':id/read')
  @UseGuards(AuthGuard)
  async markRead(@Req() req, @Param('id') id: string) {
    return firstValueFrom(
      this.notificationClient.send(NOTIFICATION_SERVICE.ACTIONS.MARK_READ, {
        userId: req.user.id,
        notificationId: id,
      }),
    );
  }

  @Patch('read-all')
  @UseGuards(AuthGuard)
  async markAllRead(@Req() req) {
    return firstValueFrom(
      this.notificationClient.send(
        NOTIFICATION_SERVICE.ACTIONS.MARK_ALL_READ,
        { userId: req.user.id },
      ),
    );
  }

  @Post()
  @UseGuards(AuthGuard)
  async createForCurrentUser(
    @Req() req,
    @Body()
    body: {
      title: string;
      message: string;
      type?: string;
      data?: Record<string, any>;
    },
  ) {
    return firstValueFrom(
      this.notificationClient.send(
        NOTIFICATION_SERVICE.ACTIONS.CREATE_NOTIFICATION,
        {
          userId: req.user.id,
          title: body.title,
          message: body.message,
          type: body.type,
          data: body.data,
        },
      ),
    );
  }
}
