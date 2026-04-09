import { Inject, Injectable, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { firstValueFrom } from 'rxjs';
import { Server } from 'socket.io';
import { User } from '@app/common/database/entities/user.entity';
import { CHAT_SERVICE } from '@app/contracts/constants/chat-service.constant';
import { NOTIFICATION_SERVICE } from '@app/contracts/constants/notification.constant';
import { CHAT_WEBSOCKET_EVENTS } from '@app/contracts';

@Injectable()
export class ChatGatewayService {
  private readonly logger = new Logger('ChatGatewayService');

  // In-memory rate limiter: userId -> timestamps of recent messages
  private readonly rateLimitMap = new Map<string, number[]>();
  private readonly MAX_MESSAGES_PER_WINDOW = 10;
  private readonly RATE_LIMIT_WINDOW_MS = 5000;

  // In-memory map of userId → Set of socket IDs
  private readonly connectedUsers = new Map<string, Set<string>>();

  constructor(
    @Inject(CHAT_SERVICE.NAME) private readonly chatServiceClient: ClientProxy,
    @Inject(NOTIFICATION_SERVICE.NAME)
    private readonly notificationClient: ClientProxy,
    @InjectRepository(User) private readonly userRepository: Repository<User>,
  ) {}

  getConnectedUsers(): Map<string, Set<string>> {
    return this.connectedUsers;
  }

  isOnline(userId: string): boolean {
    const sockets = this.connectedUsers.get(userId);
    return sockets != null && sockets.size > 0;
  }

  addSocket(userId: string, socketId: string): boolean {
    if (!this.connectedUsers.has(userId))
      this.connectedUsers.set(userId, new Set());

    const sockets = this.connectedUsers.get(userId)!;
    const isNewOnline = sockets.size === 0;
    sockets.add(socketId);
    return isNewOnline;
  }

  removeSocket(userId: string, socketId: string): boolean {
    const sockets = this.connectedUsers.get(userId);
    if (!sockets) return false;

    sockets.delete(socketId);
    if (sockets.size === 0) {
      this.connectedUsers.delete(userId);
      return true; // Fully offline
    }
    return false; // Still online
  }

  isRateLimited(userId: string): boolean {
    const now = Date.now();
    const timestamps = (this.rateLimitMap.get(userId) || []).filter(
      (ts) => now - ts < this.RATE_LIMIT_WINDOW_MS,
    );
    if (timestamps.length >= this.MAX_MESSAGES_PER_WINDOW) return true;
    timestamps.push(now);
    this.rateLimitMap.set(userId, timestamps);
    return false;
  }

  async getCallerProfile(userId: string) {
    try {
      const user = await this.userRepository.findOne({
        where: { id: userId },
        relations: ['employee', 'company'],
      });
      if (!user) return { name: 'Unknown', avatar: '/avatars/default.png' };
      const emp = user.employee;
      const co = user.company;
      const name = emp
        ? [emp.firstname, emp.lastname].filter(Boolean).join(' ') ||
          emp.username ||
          user.email ||
          'Unknown'
        : co?.name || user.email || 'Unknown';
      const avatar = emp?.avatar || co?.avatar || '/avatars/default.png';
      return { name, avatar };
    } catch {
      return { name: 'Unknown', avatar: '/avatars/default.png' };
    }
  }

  buildChatNotificationPreview(params: {
    messageType: string;
    content: string;
    hasAttachment: boolean;
    attachmentFilename?: string | null;
  }) {
    const type = (params.messageType || 'text').toLowerCase();

    if (type === 'audio') return 'Audio message';
    if (type === 'image') return 'Photo';
    if (type === 'document') return params.attachmentFilename || 'Attachment';
    if (type === 'call') return 'Call';

    const trimmed = params.content?.trim() ?? '';
    if (!trimmed && params.hasAttachment)
      return params.attachmentFilename || 'Attachment';
    if (!trimmed) return 'New message';

    return trimmed.length > 140 ? `${trimmed.slice(0, 140)}...` : trimmed;
  }

  async notifyChatMessage(
    server: Server,
    params: {
      senderId: string;
      receiverId: string;
      messageType: string;
      content: string;
      hasAttachment: boolean;
      attachmentFilename?: string | null;
      messageId: string;
    },
  ) {
    try {
      const senderProfile = await this.getCallerProfile(params.senderId);
      const receiverOnline = this.isOnline(params.receiverId);

      const preview = this.buildChatNotificationPreview({
        messageType: params.messageType,
        content: params.content,
        hasAttachment: params.hasAttachment,
        attachmentFilename: params.attachmentFilename ?? null,
      });

      const savedNotification = await firstValueFrom(
        this.notificationClient.send(
          NOTIFICATION_SERVICE.ACTIONS.CREATE_NOTIFICATION,
          {
            userId: params.receiverId,
            title: senderProfile?.name || 'New message',
            message: preview,
            type: 'chat',
            data: {
              senderId: params.senderId,
              receiverId: params.receiverId,
              messageId: params.messageId,
              messageType: params.messageType,
              url: `/message?chat=${params.senderId}`,
            },
            sendPush: !receiverOnline,
            senderAvatar: senderProfile?.avatar || null,
          },
        ),
      );

      if (savedNotification?.id)
        server
          .to(params.receiverId)
          .emit(CHAT_WEBSOCKET_EVENTS.NEW_NOTIFICATION, savedNotification);
    } catch (error: any) {
      this.logger.warn(
        `[WS] Failed to create chat notification: ${error?.message || 'Unknown error'}`,
      );
    }
  }

  async emitCallLogMessage(
    server: Server,
    params: {
      senderId: string;
      receiverId: string;
      content: string;
    },
  ) {
    try {
      const savedMessage = await firstValueFrom(
        this.chatServiceClient.send(CHAT_SERVICE.ACTIONS.CREATE_MESSAGE, {
          senderId: params.senderId,
          receiverId: params.receiverId,
          content: params.content,
          type: 'call',
          timestamp: new Date(),
        }),
      );

      server.to(params.receiverId).emit(CHAT_WEBSOCKET_EVENTS.NEW_MESSAGE, {
        ...savedMessage,
        isMe: false,
      });
      server.to(params.senderId).emit(CHAT_WEBSOCKET_EVENTS.NEW_MESSAGE, {
        ...savedMessage,
        isMe: true,
      });
    } catch (error: any) {
      this.logger.error(
        `[WS] Failed to log call message: ${error?.message || 'Unknown'}`,
      );
    }
  }
}
