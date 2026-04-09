import { EMessageType } from '@app/common/database/enums/message-type.enum';
import { TChatPayload } from '@app/contracts/interfaces/chat.interface';
import { IPayload } from '@app/common/jwt/interfaces/payload.interface';
import { JwtService } from '@app/common/jwt/jwt.service';
import { Inject, Logger } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { firstValueFrom } from 'rxjs';
import { Server, Socket } from 'socket.io';
import { CHAT_SERVICE } from '@app/contracts/constants/chat-service.constant';
import { ClientProxy } from '@nestjs/microservices';
import { ChatGatewayService } from './chat-gateway.service';
import { extractChatToken } from './utils/chat-token.util';
import { isOriginAllowed } from '../utils/cors-origin.util';
import { CHAT_ALLOW_ALL_CORS, CHAT_ALLOWED_ORIGINS } from '@app/contracts';

@WebSocketGateway({
  namespace: '/chat',
  transports: ['websocket', 'polling'],
  cors: {
    origin: (
      origin: string,
      callback: (err: Error | null, allow: boolean) => void,
    ) => {
      if (CHAT_ALLOW_ALL_CORS || isOriginAllowed(origin, CHAT_ALLOWED_ORIGINS))
        callback(null, true);
      else callback(new Error(`CORS: origin ${origin} not allowed`), false);
    },
    credentials: true,
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private logger = new Logger('ChatGateway');

  private readonly MAX_MESSAGE_LENGTH = 5000;
  private readonly VALID_MESSAGE_TYPES = Object.values(EMessageType);

  constructor(
    private readonly jwtService: JwtService,
    private readonly chatGatewayService: ChatGatewayService,
    @Inject(CHAT_SERVICE.NAME) private readonly chatServiceClient: ClientProxy,
  ) {}

  async handleConnection(client: Socket): Promise<void> {
    this.logger.log(`[WS] New connection attempt: socketId=${client.id}`);
    try {
      const token = extractChatToken(client);

      if (!token) {
        this.logger.warn('[WS] No token provided — disconnecting client');
        client.emit('error', { message: 'Authentication required' });
        client.disconnect(true);
        return;
      }

      let payload: IPayload;
      try {
        payload = await this.jwtService.verifyToken(token);
      } catch {
        this.logger.warn(`[WS] Invalid token — disconnecting ${client.id}`);
        client.emit('error', { message: 'Invalid or expired token' });
        client.disconnect(true);
        return;
      }

      client.data.userId = payload.id;
      client.join(payload.id);

      const isNewOnline = this.chatGatewayService.addSocket(
        payload.id,
        client.id,
      );

      if (isNewOnline) {
        this.server.emit('userStatus', {
          userId: payload.id,
          status: 'online',
        });
      }

      this.logger.log(
        `[WS] User connected: userId=${payload.id}, socketId=${client.id}`,
      );
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      this.logger.error(`[WS] Connection handler error: ${errorMessage}`);
      client.disconnect(true);
    }
  }

  async handleDisconnect(client: Socket): Promise<void> {
    const userId = client.data.userId;
    if (!userId) return;

    const isFullyOffline = this.chatGatewayService.removeSocket(
      userId,
      client.id,
    );

    if (isFullyOffline) {
      this.server.emit('userStatus', { userId, status: 'offline' });
      this.logger.log(
        `[WS] User fully offline: ${userId} (socket ${client.id})`,
      );
    } else {
      this.logger.log(
        `[WS] Socket closed but user still online: ${userId} (remaining sockets exists)`,
      );
    }
  }

  @SubscribeMessage('getOnlineUsers')
  handleGetOnlineUsers(userIds: string[]): Record<string, boolean> {
    if (!Array.isArray(userIds)) return {};

    const result: Record<string, boolean> = {};
    for (const id of userIds) {
      result[id] = this.chatGatewayService.isOnline(id);
    }

    this.logger.log(
      `[WS] getOnlineUsers for ${userIds.length} IDs: ` +
        `${Object.values(result).filter(Boolean).length} online`,
    );

    return result;
  }

  @SubscribeMessage('sendMessage')
  async handleMessage(client: Socket, payload: TChatPayload): Promise<any> {
    this.logger.log(
      `[WS] sendMessage received from userId=${client.data.userId}, receiverId=${payload?.receiverId}, content.length=${payload?.content?.length}`,
    );
    try {
      if (!client.data.userId) {
        client.emit('error', { message: 'Unauthorized' });
        return;
      }

      if (this.chatGatewayService.isRateLimited(client.data.userId)) {
        client.emit('error', { message: 'Too many messages — slow down' });
        return;
      }

      if (!payload?.receiverId || typeof payload.receiverId !== 'string') {
        client.emit('error', {
          message: 'Invalid message payload: missing receiverId',
        });
        return;
      }

      const trimmedContent = payload?.content?.trim() ?? '';
      const hasAttachment = !!payload?.attachment;
      if (trimmedContent.length > this.MAX_MESSAGE_LENGTH) {
        client.emit('error', {
          message: `Message must be at most ${this.MAX_MESSAGE_LENGTH} characters`,
        });
        return;
      }
      if (!trimmedContent && !hasAttachment) {
        client.emit('error', { message: 'Message cannot be empty' });
        return;
      }

      const messageType = payload.type ?? 'text';
      if (!this.VALID_MESSAGE_TYPES.includes(messageType as any)) {
        client.emit('error', { message: 'Invalid message type' });
        return;
      }

      const usersData = await firstValueFrom(
        this.chatServiceClient.send('validateChatUsers', {
          senderId: client.data.userId,
          receiverId: payload.receiverId,
        }),
      );

      const messagePayload = {
        senderId: usersData.sender.id,
        receiverId: usersData.receiver.id,
        content: trimmedContent,
        type: messageType,
        timestamp: new Date(),
        replyToId: payload.replyToId ?? null,
        attachment: payload.attachment ?? null,
        attachmentFilename: payload.attachmentFilename ?? null,
        attachmentDuration: payload.attachmentDuration ?? null,
        attachmentAmplitude: payload.attachmentAmplitude ?? null,
      };

      const savedMessage = await firstValueFrom(
        this.chatServiceClient.send('createMessage', messagePayload),
      );

      this.server.to(usersData.receiver.id).emit('newMessage', {
        ...savedMessage,
        isMe: false,
      });

      this.server.to(usersData.sender.id).emit('newMessage', {
        ...savedMessage,
        isMe: true,
      });

      void this.chatGatewayService.notifyChatMessage(this.server, {
        senderId: usersData.sender.id,
        receiverId: usersData.receiver.id,
        messageType,
        content: trimmedContent,
        hasAttachment,
        attachmentFilename: payload.attachmentFilename ?? null,
        messageId: savedMessage.id,
      });

      return {
        status: 'sent',
        message: {
          ...savedMessage,
          receiver: {
            id: usersData.receiver.id,
            role: usersData.receiver.role,
            email: usersData.receiver.email,
          },
        },
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Message handling error: ${errorMessage}`);
      client.emit('error', { message: 'Failed to send message' });
    }
  }

  @SubscribeMessage('getRecentChats')
  async handleGetRecentChats(client: Socket): Promise<any> {
    const userId = client.data.userId;
    try {
      this.logger.log(`[WS] Fetching recent chats for userId=${userId}`);
      const chats = await firstValueFrom(
        this.chatServiceClient.send('getRecentChats', userId),
      );
      return chats;
    } catch (error: any) {
      this.logger.error(`getRecentChats error: ${error?.message || 'Unknown'}`);
      return [];
    }
  }

  @SubscribeMessage('getChatHistory')
  async handleGetChatHistory(
    client: Socket,
    payload: { userId2: string; limit?: number; offset?: number },
  ): Promise<any> {
    const userId1 = client.data.userId;
    try {
      this.logger.log(
        `[WS] Fetching history: user1=${userId1}, user2=${payload.userId2}`,
      );
      const history = await firstValueFrom(
        this.chatServiceClient.send('getChatHistory', {
          userId1,
          userId2: payload.userId2,
          limit: Math.min(Math.max(1, payload.limit || 50), 100),
          offset: Math.min(Math.max(0, payload.offset || 0), 10_000),
        }),
      );
      return history;
    } catch (error: any) {
      this.logger.error(`getChatHistory error: ${error?.message || 'Unknown'}`);
      return [];
    }
  }

  @SubscribeMessage('getUnreadCount')
  async handleGetUnreadCount(client: Socket): Promise<{ unreadCount: number }> {
    const userId = client.data.userId;
    try {
      const count = await firstValueFrom(
        this.chatServiceClient.send('getUnreadCount', userId),
      );
      return { unreadCount: typeof count === 'number' ? count : 0 };
    } catch (error: any) {
      this.logger.error(`getUnreadCount error: ${error?.message || 'Unknown'}`);
      return { unreadCount: 0 };
    }
  }

  @SubscribeMessage('markAsRead')
  async handleRead(
    client: Socket,
    payload: { messageId: string; senderId?: string } | string,
  ): Promise<{ success: boolean; messageId: string }> {
    try {
      if (!client.data.userId) {
        client.emit('error', { message: 'Unauthorized' });
        return;
      }

      const messageId =
        typeof payload === 'string' ? payload : payload?.messageId;
      const senderId =
        typeof payload === 'object' ? payload?.senderId : undefined;

      if (!messageId || typeof messageId !== 'string') {
        client.emit('error', { message: 'Message ID required' });
        return;
      }

      await firstValueFrom(
        this.chatServiceClient.send('markMessageRead', {
          messageId,
          readerId: client.data.userId,
        }),
      );

      this.logger.log(
        `[WS] Message ${messageId} marked as read by ${client.data.userId}`,
      );

      if (senderId) {
        this.server.to(senderId).emit('messageRead', {
          messageId,
          readerId: client.data.userId,
        });
      }

      return { success: true, messageId };
    } catch (error: any) {
      const errorMessage = error?.message || 'Unknown error';
      this.logger.error(`Mark read error: ${errorMessage}`);
      client.emit('error', { message: 'Failed to mark as read' });
    }
  }

  @SubscribeMessage('typing')
  async handleTyping(
    client: Socket,
    data: { receiverId: string; isTyping: boolean },
  ): Promise<void> {
    if (!data?.receiverId || typeof data.isTyping !== 'boolean') {
      client.emit('error', { message: 'Invalid typing payload' });
      return;
    }
    try {
      this.server.to(data.receiverId).emit('userTyping', {
        userId: client.data.userId,
        isTyping: data.isTyping,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Typing indicator error: ${errorMessage}`);
      client.emit('error', { message: 'Failed to send typing indicator' });
    }
  }

  @SubscribeMessage('react')
  async handleReaction(
    client: Socket,
    data: { messageId: string; receiverId: string; emoji: string | null },
  ): Promise<void> {
    try {
      this.logger.log(
        `[WS] Reaction received: messageId=${data.messageId}, userId=${client.data.userId}, emoji=${data.emoji}`,
      );

      const result = await firstValueFrom(
        this.chatServiceClient.send('updateReaction', {
          messageId: data.messageId,
          userId: client.data.userId,
          emoji: data.emoji,
        }),
      );

      const payload = {
        messageId: data.messageId,
        reactions: result.reactions,
      };

      this.server.to(client.data.userId).emit('messageReaction', payload);
      this.server.to(data.receiverId).emit('messageReaction', payload);

      this.logger.log(
        `[WS] Reaction broadcasted for message ${data.messageId}`,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Reaction error: ${errorMessage}`);
      client.emit('error', { message: errorMessage });
    }
  }

  @SubscribeMessage('editMessage')
  async handleEditMessage(
    client: Socket,
    data: { messageId: string; receiverId: string; newContent: string },
  ): Promise<void> {
    if (!client.data.userId) {
      client.emit('error', { message: 'Unauthorized' });
      return;
    }

    if (!data?.messageId || typeof data.messageId !== 'string') {
      client.emit('error', { message: 'messageId is required' });
      return;
    }

    const trimmed = data.newContent?.trim();
    if (!trimmed || trimmed.length > 5000) {
      client.emit('error', { message: 'Message must be 1–5000 characters' });
      return;
    }

    try {
      const result = await firstValueFrom(
        this.chatServiceClient.send('editMessage', {
          messageId: data.messageId,
          requesterId: client.data.userId,
          newContent: trimmed,
        }),
      );

      const broadcastPayload = {
        messageId: data.messageId,
        newContent: trimmed,
        isEdited: true,
      };

      this.server
        .to(client.data.userId)
        .emit('messageEdited', broadcastPayload);

      if (data.receiverId) {
        this.server.to(data.receiverId).emit('messageEdited', broadcastPayload);
      }

      return result;
    } catch (error: any) {
      const errorMessage = error?.message || 'Unknown error';
      this.logger.error(`Edit message error: ${errorMessage}`);
      client.emit('error', { message: errorMessage });
    }
  }

  @SubscribeMessage('deleteMessage')
  async handleDeleteMessage(
    client: Socket,
    data: { messageId: string; receiverId: string },
  ): Promise<void> {
    if (!client.data.userId) {
      client.emit('error', { message: 'Unauthorized' });
      return;
    }

    if (!data?.messageId || typeof data.messageId !== 'string') {
      client.emit('error', { message: 'messageId is required' });
      return;
    }

    try {
      const result = await firstValueFrom(
        this.chatServiceClient.send('deleteMessage', {
          messageId: data.messageId,
          requesterId: client.data.userId,
        }),
      );

      const broadcastPayload = { messageId: data.messageId };

      this.server
        .to(client.data.userId)
        .emit('messageDeleted', broadcastPayload);

      if (data.receiverId) {
        this.server
          .to(data.receiverId)
          .emit('messageDeleted', broadcastPayload);
      }

      return result;
    } catch (error: any) {
      const errorMessage = error?.message || 'Unknown error';
      this.logger.error(`Delete message error: ${errorMessage}`);
      client.emit('error', { message: errorMessage });
    }
  }
}
