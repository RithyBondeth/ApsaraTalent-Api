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
    origin: ['*'],
    credentials: true,
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private logger = new Logger('ChatGateway');
  private onlineUsers = new Map<string, string>();

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    @Inject(CHAT_SERVICE.NAME) private chatServiceClient: ClientProxy,
  ) {}

  async handleConnection(client: Socket) {
    this.logger.log(`[WS] New connection attempt: socketId=${client.id}`);
    try {
      // auth-token is httpOnly — JS can't read it, but withCredentials sends it in the WS upgrade headers
      const cookieHeader = (client.handshake.headers?.cookie as string) || '';
      const cookieToken = cookieHeader.match(/auth-token=([^;]+)/)?.[1];

      const token =
        (client.handshake.auth as any)?.token ||
        client.handshake.headers?.authorization?.split(' ')[1] ||
        cookieToken;

      this.logger.log(
        `[WS] Token present: ${!!token}, source: ${
          (client.handshake.auth as any)?.token
            ? 'auth.token'
            : client.handshake.headers?.authorization
              ? 'Authorization header'
              : cookieToken
                ? 'Cookie header'
                : 'none'
        }`,
      );

      if (!token) {
        this.logger.error('[WS] No token provided — disconnecting client');
        throw new Error('No token provided');
      }

      const payload: IPayload = await this.jwtService.verifyToken(token);
      client.data.userId = payload.id;
      this.onlineUsers.set(payload.id, client.id);

      // Join user to their personal room
      client.join(payload.id);

      // Notify user is online
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
      this.onlineUsers.delete(userId);
      this.server.emit('userStatus', {
        userId,
        status: 'offline',
      });
      this.logger.log(`User disconnected: ${userId}`);
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

      const message = {
        senderId: client.data.userId,
        receiverId: payload.receiverId,
        content: payload.content.trim(),
        type: payload.type || 'text',
        timestamp: new Date(),
      };

      // Save message — use send() not emit() so errors are surfaced
      await firstValueFrom(
        this.chatServiceClient.send('createMessage', message),
      );

      // Deliver to recipient if online
      const recipientSocketId = this.onlineUsers.get(payload.receiverId);
      if (recipientSocketId) {
        this.server.to(recipientSocketId).emit('newMessage', {
          ...message,
          sender: {
            id: usersData.sender.id,
            role: usersData.sender.role,
            email: usersData.sender.email,
          },
        });
      }

      // Confirm to sender
      return {
        status: recipientSocketId ? 'delivered' : 'sent',
        message: {
          ...message,
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

      // Mark as read in the DB (using send so errors propagate)
      await firstValueFrom(
        this.chatServiceClient.send('markMessageRead', {
          messageId,
          readerId: client.data.userId,
        }),
      );

      this.logger.log(
        `[WS] Message ${messageId} marked as read by ${client.data.userId}`,
      );

      // Notify the original sender in real time so they can show "Seen"
      if (senderId) {
        const senderSocketId = this.onlineUsers.get(senderId);
        if (senderSocketId) {
          this.server.to(senderSocketId).emit('messageRead', { messageId });
          this.logger.log(
            `[WS] Notified sender ${senderId} that message ${messageId} was seen`,
          );
        }
      }

      return { success: true, messageId };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Mark read error: ${errorMessage}`);
      client.emit('error', { message: 'Failed to mark as read' });
    }
  }

  @SubscribeMessage('getChatHistory')
  async handleGetHistory(
    client: Socket,
    data: { userId2: string; limit?: number; offset?: number },
  ) {
    try {
      if (!data.userId2) {
        client.emit('error', { message: 'User ID required' });
        return;
      }

      const history = await firstValueFrom(
        this.chatServiceClient.send('getChatHistory', {
          userId1: client.data.userId,
          userId2: data.userId2,
          limit: data.limit || 50,
          offset: data.offset || 0,
        }),
      );

      return history;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Get history error: ${errorMessage}`);
      client.emit('error', { message: 'Failed to get chat history' });
    }
  }

  @SubscribeMessage('getUnreadCount')
  async handleUnreadCount(client: Socket) {
    try {
      const count = await firstValueFrom(
        this.chatServiceClient.send('getUnreadCount', client.data.userId),
      );

      return { unreadCount: count };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Get unread count error: ${errorMessage}`);
      client.emit('error', { message: 'Failed to get unread count' });
    }
  }

  @SubscribeMessage('getRecentChats')
  async handleRecentChats(client: Socket) {
    try {
      const recentChats = await firstValueFrom(
        this.chatServiceClient.send('getRecentChats', client.data.userId),
      );

      return recentChats;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Get recent chats error: ${errorMessage}`);
      client.emit('error', { message: 'Failed to get recent chats' });
    }
  }

  @SubscribeMessage('typing')
  async handleTyping(
    client: Socket,
    data: { receiverId: string; isTyping: boolean },
  ) {
    try {
      const recipientSocketId = this.onlineUsers.get(data.receiverId);
      if (recipientSocketId) {
        this.server.to(recipientSocketId).emit('userTyping', {
          userId: client.data.userId,
          isTyping: data.isTyping,
        });
      }
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

      // Broadcast to both users (sender and receiver)
      // Since it's a 1-on-1 chat, we emit to both personal rooms
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
      client.emit('error', { message: 'Failed to update reaction' });
    }
  }
}
