import { AuthGuard } from '@app/common/guards/auth.guard';
import {
  Body,
  Controller,
  Delete,
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
import { NOTIFICATION_SERVICE } from '@app/contracts/constants/service-actions/notification-service.constant';
import { INotificationController } from '@app/contracts/interfaces/domain/notification.interface';
import { rpcCall } from '../utils/rpc-call';

@Controller('notification')
export class NotificationController implements INotificationController {
  constructor(
    @Inject(NOTIFICATION_SERVICE.NAME)
    private readonly notificationClient: ClientProxy,
  ) {}

  @Get('all')
  async getAllNotification(): Promise<any> {
    return rpcCall(
      this.notificationClient,
      NOTIFICATION_SERVICE.ACTIONS.FIND_ALL_NOTIFICATIONS,
      {},
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
    return rpcCall(
      this.notificationClient,
      NOTIFICATION_SERVICE.ACTIONS.LIST_BY_USER,
      {
        userId: req.user.id,
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
        unreadOnly: unreadOnly === 'true',
      },
    );
  }

  @Get('unread-count')
  @UseGuards(AuthGuard)
  async getUnreadCount(@Req() req) {
    return rpcCall(
      this.notificationClient,
      NOTIFICATION_SERVICE.ACTIONS.GET_UNREAD_COUNT,
      { userId: req.user.id },
    );
  }

  @Patch(':id/read')
  @UseGuards(AuthGuard)
  async markRead(@Req() req, @Param('id') id: string) {
    return rpcCall(
      this.notificationClient,
      NOTIFICATION_SERVICE.ACTIONS.MARK_READ,
      { userId: req.user.id, notificationId: id },
    );
  }

  @Patch('read-all')
  @UseGuards(AuthGuard)
  async markAllRead(@Req() req) {
    return rpcCall(
      this.notificationClient,
      NOTIFICATION_SERVICE.ACTIONS.MARK_ALL_READ,
      { userId: req.user.id },
    );
  }

  @Delete(':id')
  @UseGuards(AuthGuard)
  async deleteNotification(@Req() req, @Param('id') id: string) {
    return rpcCall(
      this.notificationClient,
      NOTIFICATION_SERVICE.ACTIONS.DELETE_NOTIFICATION,
      { userId: req.user.id, notificationId: id },
    );
  }

  @Delete()
  @UseGuards(AuthGuard)
  async deleteAllNotifications(@Req() req) {
    return rpcCall(
      this.notificationClient,
      NOTIFICATION_SERVICE.ACTIONS.DELETE_ALL_NOTIFICATIONS,
      { userId: req.user.id },
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
    return rpcCall(
      this.notificationClient,
      NOTIFICATION_SERVICE.ACTIONS.CREATE_NOTIFICATION,
      {
        userId: req.user.id,
        title: body.title,
        message: body.message,
        type: body.type,
        data: body.data,
      },
    );
  }
}
