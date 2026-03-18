import { Notification } from '@app/common/database/entities/notification.entity';
import { User } from '@app/common/database/entities/user.entity';
import {
  CreateNotificationPayload,
  ListNotificationsPayload,
  MarkAllReadPayload,
  MarkReadPayload,
  UnreadCountPayload,
} from '@app/common/interfaces/notification.interface';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PushNotificationService } from './push-notification.service';

@Injectable()
export class NotificationServiceService {
  private readonly logger = new Logger(NotificationServiceService.name);

  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepo: Repository<Notification>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly pushNotificationService: PushNotificationService,
  ) {}

  async findAllNotification(): Promise<any> {
    return this.notificationRepo.find({
      order: { createdAt: 'DESC' },
      take: 100,
    });
  }

  async createNotification(payload: CreateNotificationPayload) {
    const notification = this.notificationRepo.create({
      user: { id: payload.userId } as any,
      title: payload.title,
      message: payload.message,
      type: payload.type ?? null,
      data: payload.data ?? null,
      isRead: false,
    });
    const saved = await this.notificationRepo.save(notification);

    if (payload.sendPush) {
      try {
        const user = await this.userRepo.findOne({
          where: { id: payload.userId },
        });
        const token = user?.pushNotificationToken;
        if (!token) {
          this.logger.warn(
            `Push skipped: no token for userId=${payload.userId}`,
          );
        } else {
          const result = await this.pushNotificationService.sendToToken(token, {
            title: payload.title,
            body: payload.message,
            data: payload.data ?? undefined,
            senderAvatar: payload.senderAvatar ?? null,
          });
          if (result?.success) {
            this.logger.log(
              `Push sent to userId=${payload.userId} (token length ${token.length})`,
            );
          } else if (result?.skipped) {
            this.logger.warn(
              `Push skipped for userId=${payload.userId}: ${result.reason}`,
            );
          }
        }
      } catch (error: any) {
        this.logger.warn(
          `Push notification failed: ${error?.message || 'Unknown error'}`,
        );
      }
    }

    return saved;
  }

  async listByUser(payload: ListNotificationsPayload) {
    const page = Math.max(1, payload.page ?? 1);
    const limit = Math.min(Math.max(1, payload.limit ?? 20), 100);
    const skip = (page - 1) * limit;

    const where: any = { user: { id: payload.userId } };
    if (payload.unreadOnly) where.isRead = false;

    const [items, total] = await this.notificationRepo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      take: limit,
      skip,
    });

    return { items, total, page, limit };
  }

  async markRead(payload: MarkReadPayload) {
    const result = await this.notificationRepo.update(
      { id: payload.notificationId, user: { id: payload.userId } as any },
      { isRead: true },
    );
    return { success: result.affected > 0 };
  }

  async markAllRead(payload: MarkAllReadPayload) {
    const result = await this.notificationRepo.update(
      { user: { id: payload.userId } as any, isRead: false },
      { isRead: true },
    );
    return { success: true, affected: result.affected ?? 0 };
  }

  async getUnreadCount(payload: UnreadCountPayload) {
    const count = await this.notificationRepo.count({
      where: { user: { id: payload.userId } as any, isRead: false },
    });
    return { unreadCount: count };
  }
}
