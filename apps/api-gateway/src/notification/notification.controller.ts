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
import {
  UnreadCountResponseDTO,
  GetAllNotificationResponseDTO,
  ListNotificationsQueryDTO,
  NotificationListByUserResponseDTO,
  MarkNotificationAsReadResponseDTO,
  ReadAllNotificationResponseDTO,
  DeleteNotificationResponseDTO,
  CreateNotificationCurrentUserResponseDTO,
  CreateNotificationCurrentUserDTO,
} from '@app/contracts/dtos/notification';
import { rpcCall } from '../utils/rpc-call';

@Controller('notification')
export class NotificationController implements INotificationController {
  constructor(
    @Inject(NOTIFICATION_SERVICE.NAME)
    private readonly notificationClient: ClientProxy,
  ) {}

  @Get('all')
  async getAllNotification(): Promise<GetAllNotificationResponseDTO[]> {
    return rpcCall<GetAllNotificationResponseDTO[]>(
      this.notificationClient,
      NOTIFICATION_SERVICE.ACTIONS.FIND_ALL_NOTIFICATIONS,
      {},
    );
  }

  @Get()
  @UseGuards(AuthGuard)
  async listByUser(
    @Req() req: any,
    @Query() listNotificationsQueryDTO: ListNotificationsQueryDTO,
  ): Promise<NotificationListByUserResponseDTO> {
    return rpcCall<NotificationListByUserResponseDTO>(
      this.notificationClient,
      NOTIFICATION_SERVICE.ACTIONS.LIST_BY_USER,
      {
        userId: req.user.id,
        ...listNotificationsQueryDTO,
      },
    );
  }

  @Get('unread-count')
  @UseGuards(AuthGuard)
  async getUnreadCount(@Req() req: any): Promise<UnreadCountResponseDTO> {
    return rpcCall<UnreadCountResponseDTO>(
      this.notificationClient,
      NOTIFICATION_SERVICE.ACTIONS.GET_UNREAD_COUNT,
      { userId: req.user.id },
    );
  }

  @Patch(':id/read')
  @UseGuards(AuthGuard)
  async markRead(
    @Req() req: any,
    @Param('id') id: string,
  ): Promise<MarkNotificationAsReadResponseDTO> {
    return rpcCall<MarkNotificationAsReadResponseDTO>(
      this.notificationClient,
      NOTIFICATION_SERVICE.ACTIONS.MARK_READ,
      { userId: req.user.id, notificationId: id },
    );
  }

  @Patch('read-all')
  @UseGuards(AuthGuard)
  async markAllRead(@Req() req: any): Promise<ReadAllNotificationResponseDTO> {
    return rpcCall<ReadAllNotificationResponseDTO>(
      this.notificationClient,
      NOTIFICATION_SERVICE.ACTIONS.MARK_ALL_READ,
      { userId: req.user.id },
    );
  }

  @Delete(':id')
  @UseGuards(AuthGuard)
  async deleteNotification(
    @Req() req: any,
    @Param('id') id: string,
  ): Promise<DeleteNotificationResponseDTO> {
    return rpcCall<DeleteNotificationResponseDTO>(
      this.notificationClient,
      NOTIFICATION_SERVICE.ACTIONS.DELETE_NOTIFICATION,
      { userId: req.user.id, notificationId: id },
    );
  }

  @Delete()
  @UseGuards(AuthGuard)
  async deleteAllNotifications(
    @Req() req: any,
  ): Promise<DeleteNotificationResponseDTO> {
    return rpcCall<DeleteNotificationResponseDTO>(
      this.notificationClient,
      NOTIFICATION_SERVICE.ACTIONS.DELETE_ALL_NOTIFICATIONS,
      { userId: req.user.id },
    );
  }

  @Post()
  @UseGuards(AuthGuard)
  async createForCurrentUser(
    @Req() req: any,
    @Body()
    createNotificationCurrentUserDTO: CreateNotificationCurrentUserDTO,
  ): Promise<CreateNotificationCurrentUserResponseDTO> {
    return rpcCall<CreateNotificationCurrentUserResponseDTO>(
      this.notificationClient,
      NOTIFICATION_SERVICE.ACTIONS.CREATE_NOTIFICATION,
      {
        userId: req.user.id,
        title: createNotificationCurrentUserDTO.title,
        message: createNotificationCurrentUserDTO.message,
        type: createNotificationCurrentUserDTO.type,
        data: createNotificationCurrentUserDTO.data,
      },
    );
  }
}
