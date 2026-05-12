import { Notification } from '@app/common/database/entities/notification.entity';
import { User } from '@app/common/database/entities/user.entity';
import {
  UnreadCountResponseDTO,
  GetAllNotificationResponseDTO,
  NotificationListByUserResponseDTO,
  CreateNotificationCurrentUserResponseDTO,
  CreateNotificationCurrentUserDTO,
  ListNotificationsDTO,
  MarkNotificationAsReadResponseDTO,
  NotificationIdDTO,
  NotificationUserDTO,
  ReadAllNotificationResponseDTO,
  DeleteNotificationResponseDTO,
} from '@app/contracts/dtos/notification';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PinoLogger } from 'nestjs-pino';
import { Repository } from 'typeorm';
import { PushNotificationService } from './push-notification.service';
import { INotificationService } from '@app/contracts/interfaces/service/notification-service.interface';
import { NOTIFICATION } from '@app/contracts/constants/domain/notification.constant';

@Injectable()
export class NotificationService implements INotificationService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepo: Repository<Notification>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly pushNotificationService: PushNotificationService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(NotificationService.name);
  }

  async findAllNotification(): Promise<GetAllNotificationResponseDTO[]> {
    const entities = await this.notificationRepo.find({
      order: { createdAt: 'DESC' },
      take: 100,
    });
    return entities.map(
      (n) =>
        new GetAllNotificationResponseDTO({
          id: n.id,
          title: n.title,
          message: n.message,
          type: n.type,
          data: n.data,
          isRead: n.isRead,
          createdAt: n.createdAt,
        }),
    );
  }

  async createNotification(
    createNotificationCurrentUserDTO: CreateNotificationCurrentUserDTO,
  ): Promise<CreateNotificationCurrentUserResponseDTO> {
    const notification = this.notificationRepo.create({
      user: { id: createNotificationCurrentUserDTO.userId } as any,
      title: createNotificationCurrentUserDTO.title,
      message: createNotificationCurrentUserDTO.message,
      type: createNotificationCurrentUserDTO.type ?? null,
      data: createNotificationCurrentUserDTO.data ?? null,
      isRead: false,
    });
    let saved = await this.notificationRepo.save(notification);

    if (createNotificationCurrentUserDTO.sendPush) {
      try {
        const user = await this.userRepo.findOne({
          where: { id: createNotificationCurrentUserDTO.userId },
        });
        const token = user?.pushNotificationToken;
        if (!token) {
          this.logger.warn(
            `Push skipped: no token for userId=${createNotificationCurrentUserDTO.userId}`,
          );
        } else {
          const result = await this.pushNotificationService.sendToToken(token, {
            title: createNotificationCurrentUserDTO.title,
            body: createNotificationCurrentUserDTO.message,
            data: {
              ...(createNotificationCurrentUserDTO.data ?? {}),
              targetUserId: createNotificationCurrentUserDTO.userId,
            },
            senderAvatar: createNotificationCurrentUserDTO.senderAvatar ?? null,
          });
          if (result?.success) {
            this.logger.info(
              `Push sent to userId=${createNotificationCurrentUserDTO.userId} (token length ${token.length})`,
            );
          } else if (result?.skipped) {
            this.logger.warn(
              `Push skipped for userId=${createNotificationCurrentUserDTO.userId}: ${result.reason}`,
            );
          }
        }
      } catch (error: any) {
        this.logger.warn(
          `Push notification failed: ${error?.message || 'Unknown error'}`,
        );
      }
    }

    return new CreateNotificationCurrentUserResponseDTO({
      id: saved.id,
      title: saved.title,
      message: saved.message,
      type: saved.type,
      data: saved.data,
      isRead: saved.isRead,
      createdAt: saved.createdAt,
    });
  }

  async listByUser(
    listNotificationsDTO: ListNotificationsDTO,
  ): Promise<NotificationListByUserResponseDTO> {
    const page = Math.max(
      NOTIFICATION.MIN_PAGE,
      listNotificationsDTO.page ?? NOTIFICATION.MIN_PAGE,
    );
    const limit = Math.min(
      Math.max(1, listNotificationsDTO.limit ?? NOTIFICATION.DEFAULT_LIMIT),
      NOTIFICATION.MAX_LIMIT,
    );
    const skip = (page - 1) * limit;

    const where: any = { user: { id: listNotificationsDTO.userId } };
    if (listNotificationsDTO.unreadOnly) where.isRead = false;

    const [entities, total] = await this.notificationRepo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      take: limit,
      skip,
    });

    return new NotificationListByUserResponseDTO({
      items: entities.map(
        (n) =>
          new GetAllNotificationResponseDTO({
            id: n.id,
            title: n.title,
            message: n.message,
            type: n.type,
            data: n.data,
            isRead: n.isRead,
            createdAt: n.createdAt,
          }),
      ),
      total,
      page,
      limit,
    });
  }

  async markRead(
    notificationIdDTO: NotificationIdDTO,
  ): Promise<MarkNotificationAsReadResponseDTO> {
    const result = await this.notificationRepo.update(
      {
        id: notificationIdDTO.notificationId,
        user: { id: notificationIdDTO.userId } as any,
      },
      { isRead: true },
    );
    return new MarkNotificationAsReadResponseDTO({
      success: result.affected > 0,
    });
  }

  async markAllRead(
    notificationUserDTO: NotificationUserDTO,
  ): Promise<ReadAllNotificationResponseDTO> {
    const result = await this.notificationRepo.update(
      { user: { id: notificationUserDTO.userId } as any, isRead: false },
      { isRead: true },
    );
    return new ReadAllNotificationResponseDTO({
      success: true,
      affected: result.affected ?? 0,
    });
  }

  async getUnreadCount(
    notificationUserDTO: NotificationUserDTO,
  ): Promise<UnreadCountResponseDTO> {
    const count = await this.notificationRepo.count({
      where: { user: { id: notificationUserDTO.userId } as any, isRead: false },
    });
    return new UnreadCountResponseDTO({ unreadCount: count });
  }

  async deleteNotification(
    notificationIdDTO: NotificationIdDTO,
  ): Promise<DeleteNotificationResponseDTO> {
    const result = await this.notificationRepo.delete({
      id: notificationIdDTO.notificationId,
      user: { id: notificationIdDTO.userId } as any,
    });
    return new DeleteNotificationResponseDTO({ success: result.affected > 0 });
  }

  async deleteAllNotifications(
    notificationUserDTO: NotificationUserDTO,
  ): Promise<DeleteNotificationResponseDTO> {
    const result = await this.notificationRepo.delete({
      user: { id: notificationUserDTO.userId } as any,
    });
    return new DeleteNotificationResponseDTO({
      success: true,
      affected: result.affected ?? 0,
    });
  }
}
