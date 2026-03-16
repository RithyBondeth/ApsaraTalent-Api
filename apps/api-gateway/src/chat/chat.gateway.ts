import { TChatPayload } from '@app/common/interfaces/chat.interface';
import { IPayload } from '@app/common/jwt/interfaces/payload.interface';
import { JwtService } from '@app/common/jwt/jwt.service';
import { Inject, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientProxy } from '@nestjs/microservices';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { firstValueFrom } from 'rxjs';
import { Server, Socket } from 'socket.io';
import { CHAT_SERVICE } from '../../../../utils/constants/chat-service.constant';

@WebSocketGateway({
  // No port specified — gateway attaches to the same HTTP server as the API Gateway (port 3000)
  // CHAT_SERVICE_PORT is for the internal TCP microservice, not the WebSocket server
  namespace: '/chat',
  cors: {
    origin: (origin: string, callback: (err: Error | null, allow: boolean) => void) => {
      // Allow requests with no origin (mobile apps, server-to-server) and all browser origins
      callback(null, true);
    },
    credentials: true,
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private logger = new Logger('ChatGateway');

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    @Inject(CHAT_SERVICE.NAME) private chatServiceClient: ClientProxy,
  ) {}

  async handleConnection(client: Socket) {
    this.logger.log(`[WS] New connection attempt: socketId=${client.id}`);
    try {
      const cookieHeader = (client.handshake.headers?.cookie as string) || '';
      const cookieToken = cookieHeader.match(/auth-token=([^;]+)/)?.[1];

      const token =
        (client.handshake.auth as any)?.token ||
        client.handshake.headers?.authorization?.split(' ')[1] ||
        cookieToken;

      if (!token) {
        this.logger.error('[WS] No token provided — disconnecting client');
        throw new Error('No token provided');
      }

      const payload: IPayload = await this.jwtService.verifyToken(token);
      client.data.userId = payload.id;

      // Join user to their personal room (allows targeting all their tabs)
      client.join(payload.id);

      // Notify user is online across all tabs
      this.server.emit('userStatus', {
        userId: payload.id,
        status: 'online',
      });

      this.logger.log(
        `[WS] ✅ User connected: userId=${payload.id}, socketId=${client.id}`,
      );
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      this.logger.error(`[WS] ❌ Authentication failed: ${errorMessage}`);
      client.emit('error', { message: 'Authentication failed' });
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    const userId = client.data.userId;
    if (userId) {
      this.server.emit('userStatus', {
        userId,
        status: 'offline',
      });
      this.logger.log(`User disconnected: ${userId} (socket ${client.id})`);
    }
  }

  @SubscribeMessage('sendMessage')
  async handleMessage(client: Socket, payload: TChatPayload) {
    this.logger.log(
      `[WS] 📨 sendMessage received from userId=${client.data.userId}, receiverId=${payload?.receiverId}, content.length=${payload?.content?.length}`,
    );
    try {
      // Validate payload
      if (!payload.receiverId || !payload.content?.trim()) {
        this.logger.warn(
          '[WS] Invalid payload — missing receiverId or content',
        );
        client.emit('error', { message: 'Invalid message payload' });
        return;
      }

      // Validate users exist
      this.logger.log(
        `[WS] Calling validateChatUsers: sender=${client.data.userId}, receiver=${payload.receiverId}`,
      );
      const usersData = await firstValueFrom(
        this.chatServiceClient.send('validateChatUsers', {
          senderId: client.data.userId,
          receiverId: payload.receiverId,
        }),
      );
      this.logger.log(
        `[WS] ✅ validateChatUsers success: sender=${usersData.sender?.email}, receiver=${usersData.receiver?.email}`,
      );

      const messagePayload = {
        senderId: usersData.sender.id,
        receiverId: usersData.receiver.id,
        content: payload.content.trim(),
        type: payload.type || 'text',
        timestamp: new Date(),
      };

      // Save message — capture the returned saved message which includes the DB ID
      const savedMessage = await firstValueFrom(
        this.chatServiceClient.send('createMessage', messagePayload),
      );

      // 3. Broadcast to both participants (standardized on resolved User PK rooms)
      this.server.to(usersData.receiver.id).emit('newMessage', {
        ...savedMessage,
        isMe: false,
      });

      this.server.to(usersData.sender.id).emit('newMessage', {
        ...savedMessage,
        isMe: true,
      });

      // Confirm to current tab
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
  async handleGetRecentChats(client: Socket) {
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
  ) {
    const userId1 = client.data.userId;
    try {
      this.logger.log(
        `[WS] Fetching history: user1=${userId1}, user2=${payload.userId2}`,
      );
      const history = await firstValueFrom(
        this.chatServiceClient.send('getChatHistory', {
          userId1,
          userId2: payload.userId2,
          limit: payload.limit || 100,
          offset: payload.offset || 0,
        }),
      );
      return history;
    } catch (error: any) {
      this.logger.error(`getChatHistory error: ${error?.message || 'Unknown'}`);
      return [];
    }
  }

  @SubscribeMessage('getUnreadCount')
  async handleGetUnreadCount(client: Socket) {
    const userId = client.data.userId;
    try {
      const count = await firstValueFrom(
        this.chatServiceClient.send('getUnreadCount', userId),
      );
      // chat-service returns a raw number; wrap it so the client can read res.unreadCount
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
  ) {
    try {
      const messageId =
        typeof payload === 'string' ? payload : payload?.messageId;
      const senderId =
        typeof payload === 'object' ? payload?.senderId : undefined;

      if (!messageId) {
        client.emit('error', { message: 'Message ID required' });
        return;
      }

      // Mark as read in the DB
      await firstValueFrom(
        this.chatServiceClient.send('markMessageRead', {
          messageId,
          readerId: client.data.userId,
        }),
      );

      this.logger.log(
        `[WS] Message ${messageId} marked as read by ${client.data.userId}`,
      );

      // Notify the original sender in real time across all their tabs
      if (senderId) {
        this.server.to(senderId).emit('messageRead', { messageId });
        this.logger.log(
          `[WS] Notified sender ${senderId} that message ${messageId} was seen`,
        );
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
  ) {
    try {
      // Broadcast to all of recipient's tabs
      this.server.to(data.receiverId).emit('userTyping', {
        userId: client.data.userId,
        isTyping: data.isTyping,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Typing indicator error: ${errorMessage}`);
    }
  }

  @SubscribeMessage('react')
  async handleReaction(
    client: Socket,
    data: { messageId: string; receiverId: string; emoji: string | null },
  ) {
    try {
      this.logger.log(
        `[WS] Reaction received: messageId=${data.messageId}, userId=${client.data.userId}, emoji=${data.emoji}`,
      );

      // Update DB
      const result = await firstValueFrom(
        this.chatServiceClient.send('updateReaction', {
          messageId: data.messageId,
          userId: client.data.userId,
          emoji: data.emoji,
        }),
      );

      // Broadcast to both users across all their open tabs
      const payload = {
        messageId: data.messageId,
        reactions: result.reactions,
      };

      this.server.to(client.data.userId).emit('messageReaction', payload);
      this.server.to(data.receiverId).emit('messageReaction', payload);

      this.logger.log(
        `[WS] ✅ Reaction broadcasted for message ${data.messageId}`,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Reaction error: ${errorMessage}`);
      client.emit('error', { message: errorMessage });
    }
  }
}
