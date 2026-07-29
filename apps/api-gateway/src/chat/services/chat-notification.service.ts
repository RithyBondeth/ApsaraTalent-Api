import { Inject, Injectable, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { Server } from 'socket.io';
import { CHAT_SERVICE } from '@app/contracts/constants/service-actions/chat-service.constant';
import { NOTIFICATION_SERVICE } from '@app/contracts/constants/service-actions/notification-service.constant';
import { USER_SERVICE } from '@app/contracts/constants/service-actions/user-service.constant';
import {
  CHAT,
  CHAT_WEBSOCKET_EVENTS,
  IChatNotificationService,
} from '@app/contracts';
import { UserResponseDTO } from '@app/contracts/dtos';
import { buildChatNotificationPreview } from '../utils/chat-notification.util';
import { SocketStateService } from './socket-state.service';
import { rpcCall } from '../../utils/rpc-call';

@Injectable()
export class ChatNotificationService implements IChatNotificationService {
  private readonly logger = new Logger(ChatNotificationService.name);

  constructor(
    @Inject(CHAT_SERVICE.NAME) private readonly chatServiceClient: ClientProxy,
    @Inject(NOTIFICATION_SERVICE.NAME)
    private readonly notificationClient: ClientProxy,
    @Inject(USER_SERVICE.NAME) private readonly userServiceClient: ClientProxy,
    private readonly socketStateService: SocketStateService,
  ) {}

  async getCallerProfile(userId: string): Promise<{
    name: string;
    avatar: string;
  }> {
    try {
      const user = await rpcCall<UserResponseDTO>(
        this.userServiceClient,
        USER_SERVICE.ACTIONS.FIND_ONE_BY_ID,
        userId,
      );
      if (!user) return { name: 'Unknown', avatar: CHAT.DEFAULT_AVATAR_PATH };

      const emp = user.employee;
      const co = user.company;
      const name = emp
        ? [emp.firstname, emp.lastname].filter(Boolean).join(' ') ||
          emp.username ||
          user.email ||
          'Unknown'
        : co?.name || user.email || 'Unknown';
      const avatar = emp?.avatar || co?.avatar || CHAT.DEFAULT_AVATAR_PATH;
      return { name, avatar };
    } catch {
      return { name: 'Unknown', avatar: CHAT.DEFAULT_AVATAR_PATH };
    }
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
  ): Promise<void> {
    try {
      const senderProfile = await this.getCallerProfile(params.senderId);
      const receiverOnline = this.socketStateService.isOnline(
        params.receiverId,
      );

      const preview = buildChatNotificationPreview({
        messageType: params.messageType,
        content: params.content,
        hasAttachment: params.hasAttachment,
        attachmentFilename: params.attachmentFilename ?? null,
      });

      const savedNotification = await rpcCall<any>(
        this.notificationClient,
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

  resolveCallEndContent(reason?: string): string {
    const normalized = (reason || 'ended').toLowerCase();
    if (normalized === 'missed') return 'Missed call';
    if (normalized === 'declined') return 'Call declined';
    if (normalized === 'error') return 'Call failed';
    return 'Call ended';
  }

  async emitCallLogMessage(
    server: Server,
    params: {
      senderId: string;
      receiverId: string;
      content: string;
    },
  ): Promise<void> {
    try {
      const savedMessage = await rpcCall<any>(
        this.chatServiceClient,
        CHAT_SERVICE.ACTIONS.CREATE_MESSAGE,
        {
          senderId: params.senderId,
          receiverId: params.receiverId,
          content: params.content,
          type: 'call',
          timestamp: new Date(),
        },
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
