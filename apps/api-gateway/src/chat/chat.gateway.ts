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
import { Server, Socket } from 'socket.io';
import { CHAT_SERVICE } from '../../../../utils/constants/chat-service.constant';
import { firstValueFrom } from 'rxjs';
import { TChatPayload } from '@app/common/interfaces/chat.interface';

@WebSocketGateway({
  // Note: WebSocketGateway decorator requires static values at compile time
  // Using process.env here as ConfigService is not available in decorators
  port: parseInt(process.env.CHAT_SERVICE_PORT || '3005'),
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
    try {
      const token =
        client.handshake.auth.token ||
        client.handshake.headers?.authorization?.split(' ')[1];
      if (!token) {
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

      this.logger.log(`User connected: ${payload.id}`);
    } catch (err) {
      this.logger.error(`Authentication failed: ${err.message}`);
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
    try {
      // Validate payload
      if (!payload.receiverId || !payload.content?.trim()) {
        client.emit('error', { message: 'Invalid message payload' });
        return;
      }

      // Validate users exist
      const usersData = await firstValueFrom(
        this.chatServiceClient.send('validateChatUsers', {
          senderId: client.data.userId,
          receiverId: payload.receiverId,
        }),
      );

      const message = {
        senderId: client.data.userId,
        receiverId: payload.receiverId,
        content: payload.content.trim(),
        type: payload.type || 'text',
        timestamp: new Date(),
      };

      // Save message
      this.chatServiceClient.emit('createMessage', message);

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
      this.logger.error(`Message handling error: ${error.message}`);
      client.emit('error', { message: 'Failed to send message' });
    }
  }

  @SubscribeMessage('markAsRead')
  async handleRead(client: Socket, messageId: string) {
    try {
      if (!messageId) {
        client.emit('error', { message: 'Message ID required' });
        return;
      }

      this.chatServiceClient.emit('markMessageRead', {
        messageId,
        readerId: client.data.userId,
      });

      return { success: true };
    } catch (error) {
      this.logger.error(`Mark read error: ${error.message}`);
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
      this.logger.error(`Get history error: ${error.message}`);
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
      this.logger.error(`Get unread count error: ${error.message}`);
      client.emit('error', { message: 'Failed to get unread count' });
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
      this.logger.error(`Typing indicator error: ${error.message}`);
    }
  }
}
