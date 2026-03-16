import { EMessageType } from '@app/common/database/enums/message-type.enum';
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
    origin: (
      origin: string,
      callback: (err: Error | null, allow: boolean) => void,
    ) => {
      const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
        .split(',')
        .map((o) => o.trim())
        .filter(Boolean);

      // Allow mobile/server requests with no origin, or any explicitly listed origin
      if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS: origin ${origin} not allowed`), false);
      }
    },
    credentials: true,
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private logger = new Logger('ChatGateway');

  // In-memory rate limiter: userId -> timestamps of recent messages
  private readonly rateLimitMap = new Map<string, number[]>();
  private readonly MAX_MESSAGES_PER_WINDOW = 10;
  private readonly RATE_LIMIT_WINDOW_MS = 5000; // 10 messages per 5 seconds

  private readonly MAX_MESSAGE_LENGTH = 5000;
  private readonly VALID_MESSAGE_TYPES = Object.values(EMessageType);

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    @Inject(CHAT_SERVICE.NAME) private chatServiceClient: ClientProxy,
  ) {}

  /** Returns true if this userId has exceeded the rate limit */
  private isRateLimited(userId: string): boolean {
    const now = Date.now();
    const timestamps = (this.rateLimitMap.get(userId) || []).filter(
      (ts) => now - ts < this.RATE_LIMIT_WINDOW_MS,
    );
    if (timestamps.length >= this.MAX_MESSAGES_PER_WINDOW) return true;
    timestamps.push(now);
    this.rateLimitMap.set(userId, timestamps);
    return false;
  }

  /** Extracts JWT from handshake (auth object → Bearer header → cookie) */
  private extractToken(client: Socket): string | null {
    const auth = client.handshake.auth as Record<string, string> | undefined;
    if (auth?.token) return auth.token;

    const authHeader = client.handshake.headers?.authorization;
    if (authHeader?.startsWith('Bearer ')) return authHeader.slice(7);

    const cookieHeader = (client.handshake.headers?.cookie as string) || '';
    return cookieHeader.match(/auth-token=([^;]+)/)?.[1] ?? null;
  }

  async handleConnection(client: Socket) {
    this.logger.log(`[WS] New connection attempt: socketId=${client.id}`);
    try {
      const token = this.extractToken(client);

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

      // Join user to their personal room (allows targeting all their tabs)
      client.join(payload.id);

      // Broadcast online status to ALL connected clients so any open chat window
      // can immediately show the green dot for this user.
      this.server.emit('userStatus', { userId: payload.id, status: 'online' });

      this.logger.log(
        `[WS] ✅ User connected: userId=${payload.id}, socketId=${client.id}`,
      );
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      this.logger.error(`[WS] ❌ Connection handler error: ${errorMessage}`);
      client.disconnect(true);
    }
  }

  async handleDisconnect(client: Socket) {
    const userId = client.data.userId;
    if (userId) {
      // Broadcast offline status so chat headers and sidebars update in real time
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
      // Ensure the socket is authenticated
      if (!client.data.userId) {
        client.emit('error', { message: 'Unauthorized' });
        return;
      }

      // Rate limit check
      if (this.isRateLimited(client.data.userId)) {
        client.emit('error', { message: 'Too many messages — slow down' });
        return;
      }

      // Validate receiverId
      if (!payload?.receiverId || typeof payload.receiverId !== 'string') {
        client.emit('error', { message: 'Invalid message payload: missing receiverId' });
        return;
      }

      // Validate content length (1–5000 chars)
      const trimmedContent = payload?.content?.trim() ?? '';
      if (!trimmedContent || trimmedContent.length > this.MAX_MESSAGE_LENGTH) {
        client.emit('error', {
          message: `Message must be 1–${this.MAX_MESSAGE_LENGTH} characters`,
        });
        return;
      }

      // Validate message type
      const messageType = payload.type ?? 'text';
      if (!this.VALID_MESSAGE_TYPES.includes(messageType as any)) {
        client.emit('error', { message: 'Invalid message type' });
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
        content: trimmedContent,
        type: messageType,
        timestamp: new Date(),
        // Pass reply-to reference if the sender is quoting another message.
        // null = top-level message. Stored as a plain UUID column in the DB.
        replyToId: payload.replyToId ?? null,
      };

      // Save message — capture the returned saved message which includes the DB ID
      const savedMessage = await firstValueFrom(
        this.chatServiceClient.send('createMessage', messagePayload),
      );

      // Broadcast to both participants (standardized on resolved User PK rooms).
      // The isMe flag lets the client distinguish their own messages.
      this.server.to(usersData.receiver.id).emit('newMessage', {
        ...savedMessage,
        isMe: false,
      });

      this.server.to(usersData.sender.id).emit('newMessage', {
        ...savedMessage,
        isMe: true,
      });

      // Confirm to current tab (ack callback)
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
      // Ensure the socket is authenticated
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
    if (!data?.receiverId || typeof data.isTyping !== 'boolean') {
      client.emit('error', { message: 'Invalid typing payload' });
      return;
    }
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
      client.emit('error', { message: 'Failed to send typing indicator' });
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

  /**
   * Delete (soft-delete) a message.
   *
   * Flow:
   *  1. Client emits: socket.emit('deleteMessage', { messageId, receiverId })
   *  2. Gateway verifies auth + forwards to chat-service.
   *  3. Chat-service checks ownership (only sender can delete) and sets isDeleted=true.
   *  4. Gateway broadcasts 'messageDeleted' to BOTH participants so their UIs update.
   *  5. The message row stays in the DB; the frontend renders "[This message was deleted]".
   */
  @SubscribeMessage('deleteMessage')
  async handleDeleteMessage(
    client: Socket,
    data: { messageId: string; receiverId: string },
  ) {
    if (!client.data.userId) {
      client.emit('error', { message: 'Unauthorized' });
      return;
    }

    if (!data?.messageId || typeof data.messageId !== 'string') {
      client.emit('error', { message: 'messageId is required' });
      return;
    }

    try {
      // Ask chat-service to soft-delete; it verifies ownership internally
      const result = await firstValueFrom(
        this.chatServiceClient.send('deleteMessage', {
          messageId: data.messageId,
          requesterId: client.data.userId,
        }),
      );

      // Build the broadcast payload
      const broadcastPayload = { messageId: data.messageId };

      // Notify the sender (all tabs) so the message tombstone appears immediately
      this.server.to(client.data.userId).emit('messageDeleted', broadcastPayload);

      // Notify the receiver if provided, so their view also updates in real time
      if (data.receiverId) {
        this.server.to(data.receiverId).emit('messageDeleted', broadcastPayload);
      }

      this.logger.log(
        `[WS] ✅ Message ${data.messageId} deleted by ${client.data.userId}`,
      );

      return result;
    } catch (error: any) {
      const errorMessage = error?.message || 'Unknown error';
      this.logger.error(`Delete message error: ${errorMessage}`);
      client.emit('error', { message: errorMessage });
    }
  }
}
