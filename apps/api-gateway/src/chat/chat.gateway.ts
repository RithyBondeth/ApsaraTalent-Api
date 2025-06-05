import { IPayload } from '@app/common/jwt/interfaces/payload.interface';
import { JwtService } from '@app/common/jwt/jwt.service';
import { Inject, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { CHAT_SERVICE } from 'utils/constants/chat-service.constant';
import { USER_SERVICE } from 'utils/constants/user-service.constant';
import { firstValueFrom } from 'rxjs';
import { TChatPayload } from '@app/common/interfaces/chat.interface';

@WebSocketGateway({
  namespace: '/chat',
  cors: {
    origin: '*',
    credentials: true,
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private logger = new Logger('ChatGateway');
  private onlineUsers = new Map<string, string>();

  constructor(
    private jwtService: JwtService,
    @Inject(CHAT_SERVICE.NAME) private chatServiceClient: ClientProxy,
    @Inject(USER_SERVICE.NAME) private userServiceClient: ClientProxy
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth.token;
      const payload: IPayload = await this.jwtService.verifyToken(token);
      client.data.userId = payload.id;
      this.onlineUsers.set(payload.id, client.id);
      
      // Notify user is online
      this.server.emit('userStatus', { 
        userId: payload.id, 
        status: 'online' 
      });
      
      this.logger.log(`User connected: ${payload.id}`);
    } catch (err) {
      client.disconnect();
      this.logger.error(`Authentication failed: ${err.message}`);
    }
  }

   async handleDisconnect(client: Socket) {
    const userId = client.data.userId;
    this.onlineUsers.delete(userId);
    this.server.emit('userStatus', { 
      userId, 
      status: 'offline' 
    });
    this.logger.log(`User disconnected: ${userId}`);
  }

  @SubscribeMessage('sendMessage')
  async handleMessage(client: Socket, payload: TChatPayload) {
    // Validate users exist
    const [sender, receiver] = await Promise.all([
      firstValueFrom(this.chatServiceClient.send('getUserByIdForChat', client.data.userId)),
      firstValueFrom(this.chatServiceClient.send('getUserByIdForChat', payload.receiverId))
    ]);

    if (!sender || !receiver) {
      throw new Error('User not found');
    }

    const message = {
      senderId: client.data.userId,
      receiverId: payload.receiverId,
      content: payload.content,
      type: payload.type || 'text',
      timestamp: new Date()
    };

    // 1. Save message
    this.chatServiceClient.emit('createMessage', message);

    // 2. Deliver to recipient if online
    const recipientSocketId = this.onlineUsers.get(payload.receiverId);
    if (recipientSocketId) {
      this.server.to(recipientSocketId).emit('newMessage', {
        ...message,
        sender: { id: sender.id, name: sender.email, role: sender }
      });
    }

    // 3. Confirm to sender
    return { 
      status: recipientSocketId ? 'delivered' : 'sent',
      message: {
        ...message,
        receiver: { id: receiver.id, name: receiver.name, role: receiver.role }
      }
    };
  }

  @SubscribeMessage('markAsRead')
  async handleRead(client: Socket, messageId: string) {
    this.chatServiceClient.emit('markMessageRead', {
      messageId,
      readerId: client.data.userId
    });
  }
}
