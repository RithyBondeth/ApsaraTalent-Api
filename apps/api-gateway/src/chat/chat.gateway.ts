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

  /**
   * In-memory map of userId → Set of socket IDs.
   *
   * Why a Map of Sets (not just a Set<userId>):
   *   One user may open multiple browser tabs — each tab creates a separate
   *   socket.  We must only mark the user offline when ALL their sockets
   *   disconnect.  Tracking per-socket lets us do that accurately.
   *
   * Why not rely on socket.io room size:
   *   Socket.IO removes the socket FROM the room BEFORE calling handleDisconnect,
   *   so this.server.sockets.adapter.rooms.get(userId) already returns undefined
   *   (or size 0) by the time we check — causing a false "offline" broadcast even
   *   when other tabs are still connected.  Managing our own Set avoids that race.
   */
  private readonly connectedUsers = new Map<string, Set<string>>();

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

      // Track this specific socket under the userId.
      // If the user already has other tabs open, we add to the existing Set;
      // otherwise we create a new Set.  Either way, the user is now "online".
      if (!this.connectedUsers.has(payload.id)) {
        this.connectedUsers.set(payload.id, new Set());
      }
      this.connectedUsers.get(payload.id)!.add(client.id);

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
    if (!userId) return;

    // Remove this specific socket from the user's socket set.
    // NOTE: We intentionally do NOT use socket.io room sizes here because
    //       Socket.IO removes the socket from the room BEFORE calling handleDisconnect,
    //       making rooms.get(userId).size unreliable (always appears as 0 / undefined).
    const socketSet = this.connectedUsers.get(userId);
    if (socketSet) {
      socketSet.delete(client.id);

      if (socketSet.size === 0) {
        // Last tab/device disconnected — user is truly offline
        this.connectedUsers.delete(userId);
        this.server.emit('userStatus', { userId, status: 'offline' });
        this.logger.log(
          `[WS] User fully offline: ${userId} (socket ${client.id})`,
        );
      } else {
        // Other tabs still connected — user remains online, no broadcast needed
        this.logger.log(
          `[WS] Socket closed but user still online: ${userId} (${socketSet.size} remaining sockets)`,
        );
      }
    }
  }

  /**
   * Returns the online status for a list of user IDs.
   *
   * Flow:
   *  1. Client connects and calls getRecentChats() to build the sidebar.
   *  2. Once the sidebar is rendered, the client emits 'getOnlineUsers'
   *     with the list of partner IDs from the sidebar.
   *  3. The server looks up each ID in connectedUsers and returns a map.
   *  4. The client merges the map into its onlineUsers store state.
   *
   * This solves the "already online before I joined" problem: the server
   * always has the ground truth, so a late-joining client can catch up.
   */
  @SubscribeMessage('getOnlineUsers')
  handleGetOnlineUsers(
    client: Socket,
    userIds: string[],
  ): Record<string, boolean> {
    if (!Array.isArray(userIds)) return {};

    // Build a userId → boolean map from the persistent connectedUsers map.
    // A user is online if they have at least one socket in their Set.
    const result: Record<string, boolean> = {};
    for (const id of userIds) {
      const sockets = this.connectedUsers.get(id);
      result[id] = sockets != null && sockets.size > 0;
    }

    this.logger.log(
      `[WS] getOnlineUsers for ${userIds.length} IDs: ` +
        `${Object.values(result).filter(Boolean).length} online`,
    );

    return result;
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
        // Pass attachment URL if the sender included a file/image.
        // The URL is generated by the REST upload endpoint before the socket send.
        attachment: payload.attachment ?? null,
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
   * Edit a message's text content.
   *
   * Flow:
   *  1. Client emits: socket.emit('editMessage', { messageId, receiverId, newContent })
   *  2. Gateway verifies auth + validates new content length.
   *  3. Forwards to chat-service which checks ownership and updates content + isEdited=true.
   *  4. Gateway broadcasts 'messageEdited' to BOTH participants so their UIs update live.
   *
   * Design:
   *  - Only the original sender can edit (enforced server-side).
   *  - Deleted messages cannot be edited (tombstone is immutable).
   *  - We broadcast the updated content so both tabs refresh without re-fetching history.
   */
  @SubscribeMessage('editMessage')
  async handleEditMessage(
    client: Socket,
    data: { messageId: string; receiverId: string; newContent: string },
  ) {
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
      // Ask chat-service to update content + set isEdited=true; it verifies ownership
      const result = await firstValueFrom(
        this.chatServiceClient.send('editMessage', {
          messageId: data.messageId,
          requesterId: client.data.userId,
          newContent: trimmed,
        }),
      );

      // Build the broadcast payload — both participants need the updated content
      const broadcastPayload = {
        messageId: data.messageId,
        newContent: trimmed,
        isEdited: true,
      };

      // Notify the sender across all their tabs
      this.server.to(client.data.userId).emit('messageEdited', broadcastPayload);

      // Notify the receiver so their view updates in real time
      if (data.receiverId) {
        this.server.to(data.receiverId).emit('messageEdited', broadcastPayload);
      }

      this.logger.log(
        `[WS] ✅ Message ${data.messageId} edited by ${client.data.userId}`,
      );

      return result;
    } catch (error: any) {
      const errorMessage = error?.message || 'Unknown error';
      this.logger.error(`Edit message error: ${errorMessage}`);
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
