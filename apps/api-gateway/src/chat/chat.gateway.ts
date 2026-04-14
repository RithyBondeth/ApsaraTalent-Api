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
import { ClientProxy } from '@nestjs/microservices';
import { JwtService } from '@app/common/jwt/jwt.service';
import { IPayload } from '@app/common/jwt/interfaces/payload.interface';
import { EMessageType } from '@app/common/database/enums/message-type.enum';
import { CHAT_SERVICE } from '@app/contracts/constants/service-actions/chat-service.constant';
import {
  CHAT,
  CHAT_ALLOW_ALL_CORS,
  CHAT_ALLOWED_ORIGINS,
  CHAT_WEBSOCKET_EVENTS,
  GetChatHistoryDTO,
  GetChatHistoryResponseDTO,
  GetRecentChatsResponseDTO,
  MessageResponseDTO,
  SendMessageDTO,
  SendMessageResponseDTO,
} from '@app/contracts';
import { ChatGatewayService } from './chat-gateway.service';
import { extractChatToken } from './utils/chat-token.util';
import { isOriginAllowed } from '../utils/cors-origin.util';
import { GetUnreadCountResponseDTO } from '@app/contracts/dtos/chat/chat-gateway/get-unreadcount.dto';
import {
  MarkAsReadDTO,
  MarkAsReadResponseDTO,
} from '@app/contracts/dtos/chat/chat-gateway/mark-as-read.dto';
import { TypingDTO } from '@app/contracts/dtos/chat/chat-gateway/typing.dto';
import {
  UpdateReactionDTO,
  UpdateReactionResponseDTO,
} from '@app/contracts/dtos/chat/chat-gateway/update-reaction.dto';
import {
  EditMessageDTO,
  EditMessageResponseDTO,
} from '@app/contracts/dtos/chat/chat-gateway/edit-message.dto';
import {
  DeleteMessageDTO,
  DeleteMessageResponseDTO,
} from '@app/contracts/dtos/chat/chat-gateway/delete-message.dto';

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
        this.server.emit(CHAT_WEBSOCKET_EVENTS.USER_STATUS, {
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
      this.server.emit(CHAT_WEBSOCKET_EVENTS.USER_STATUS, {
        userId,
        status: 'offline',
      });
      this.logger.log(
        `[WS] User fully offline: ${userId} (socket ${client.id})`,
      );
    } else {
      this.logger.log(
        `[WS] Socket closed but user still online: ${userId} (remaining sockets exists)`,
      );
    }
  }

  @SubscribeMessage(CHAT_WEBSOCKET_EVENTS.GET_ONLINE_USERS)
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

  @SubscribeMessage(CHAT_WEBSOCKET_EVENTS.SEND_MESSAGE)
  async handleMessage(
    client: Socket,
    payload: SendMessageDTO,
  ): Promise<SendMessageResponseDTO | void> {
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
      if (trimmedContent.length > CHAT.MAX_MESSAGE_LENGTH) {
        client.emit('error', {
          message: `Message must be at most ${CHAT.MAX_MESSAGE_LENGTH} characters`,
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
        this.chatServiceClient.send(CHAT_SERVICE.ACTIONS.VALIDATE_CHAT_USERS, {
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
        this.chatServiceClient.send(
          CHAT_SERVICE.ACTIONS.CREATE_MESSAGE,
          messagePayload,
        ),
      );

      this.server
        .to(usersData.receiver.id)
        .emit(CHAT_WEBSOCKET_EVENTS.NEW_MESSAGE, {
          ...savedMessage,
          isMe: false,
        });

      this.server
        .to(usersData.sender.id)
        .emit(CHAT_WEBSOCKET_EVENTS.NEW_MESSAGE, {
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

      return new SendMessageResponseDTO({
        status: 'sent',
        message: new MessageResponseDTO({
          ...savedMessage,
          receiver: {
            id: usersData.receiver.id,
            name: usersData.receiver.name || usersData.receiver.email,
            email: usersData.receiver.email,
          },
        }),
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Message handling error: ${errorMessage}`);
      client.emit('error', { message: 'Failed to send message' });
    }
  }

  @SubscribeMessage(CHAT_WEBSOCKET_EVENTS.GET_RECENT_CHATS)
  async handleGetRecentChats(
    client: Socket,
  ): Promise<GetRecentChatsResponseDTO[]> {
    const userId = client.data.userId;
    try {
      this.logger.log(`[WS] Fetching recent chats for userId=${userId}`);
      const chats = await firstValueFrom(
        this.chatServiceClient.send(
          CHAT_SERVICE.ACTIONS.GET_RECENT_CHATS,
          userId,
        ),
      );
      return chats;
    } catch (error: any) {
      this.logger.error(`getRecentChats error: ${error?.message || 'Unknown'}`);
      return [];
    }
  }

  @SubscribeMessage(CHAT_WEBSOCKET_EVENTS.GET_CHAT_HISTORY)
  async handleGetChatHistory(
    client: Socket,
    payload: GetChatHistoryDTO,
  ): Promise<GetChatHistoryResponseDTO> {
    const userId1 = client.data.userId;
    try {
      this.logger.log(
        `[WS] Fetching history: user1=${userId1}, user2=${payload.userId2}`,
      );
      const history = await firstValueFrom(
        this.chatServiceClient.send(CHAT_SERVICE.ACTIONS.GET_CHAT_HISTORY, {
          userId1,
          userId2: payload.userId2,
          limit: Math.min(
            Math.max(1, payload.limit || CHAT.DEFAULT_HISTORY_LIMIT),
            CHAT.MAX_HISTORY_LIMIT,
          ),
          offset: Math.min(
            Math.max(0, payload.offset || 0),
            CHAT.MAX_HISTORY_OFFSET,
          ),
        }),
      );
      return history;
    } catch (error: any) {
      this.logger.error(`getChatHistory error: ${error?.message || 'Unknown'}`);
      return new GetChatHistoryResponseDTO({
        messages: [],
        partnerId: payload.userId2,
        partnerProfile: null,
      });
    }
  }

  @SubscribeMessage(CHAT_WEBSOCKET_EVENTS.GET_UNREAD_COUNT)
  async handleGetUnreadCount(
    client: Socket,
  ): Promise<GetUnreadCountResponseDTO> {
    const userId = client.data.userId;
    try {
      const count = await firstValueFrom(
        this.chatServiceClient.send(
          CHAT_SERVICE.ACTIONS.GET_UNREAD_COUNT,
          userId,
        ),
      );
      return new GetUnreadCountResponseDTO({
        count: typeof count === 'number' ? count : 0,
      });
    } catch (error: any) {
      this.logger.error(`getUnreadCount error: ${error?.message || 'Unknown'}`);
      return new GetUnreadCountResponseDTO({ count: 0 });
    }
  }

  @SubscribeMessage(CHAT_WEBSOCKET_EVENTS.MARK_AS_READ)
  async handleRead(
    client: Socket,
    payload: MarkAsReadDTO,
  ): Promise<MarkAsReadResponseDTO | void> {
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
        this.chatServiceClient.send(CHAT_SERVICE.ACTIONS.MARK_MESSAGE_READ, {
          messageId,
          readerId: client.data.userId,
        }),
      );

      this.logger.log(
        `[WS] Message ${messageId} marked as read by ${client.data.userId}`,
      );

      if (senderId) {
        this.server.to(senderId).emit(CHAT_WEBSOCKET_EVENTS.MESSAGE_READ, {
          messageId,
          readerId: client.data.userId,
        });
      }

      return new MarkAsReadResponseDTO({ success: true, messageId });
    } catch (error: any) {
      const errorMessage = error?.message || 'Unknown error';
      this.logger.error(`Mark read error: ${errorMessage}`);
      client.emit('error', { message: 'Failed to mark as read' });
    }
  }

  @SubscribeMessage(CHAT_WEBSOCKET_EVENTS.TYPING)
  async handleTyping(client: Socket, data: TypingDTO): Promise<void> {
    if (!data?.receiverId || typeof data.isTyping !== 'boolean') {
      client.emit('error', { message: 'Invalid typing payload' });
      return;
    }
    try {
      this.server.to(data.receiverId).emit(CHAT_WEBSOCKET_EVENTS.USER_TYPING, {
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

  @SubscribeMessage(CHAT_WEBSOCKET_EVENTS.REACT)
  async handleReaction(
    client: Socket,
    data: UpdateReactionDTO,
  ): Promise<UpdateReactionResponseDTO | void> {
    try {
      this.logger.log(
        `[WS] Reaction received: messageId=${data.messageId}, userId=${client.data.userId}, emoji=${data.emoji}`,
      );

      const result = await firstValueFrom(
        this.chatServiceClient.send(CHAT_SERVICE.ACTIONS.UPDATE_REACTION, {
          messageId: data.messageId,
          userId: client.data.userId,
          emoji: data.emoji,
        }),
      );

      const payload = {
        messageId: data.messageId,
        reactions: result.reactions,
      };

      this.server
        .to(client.data.userId)
        .emit(CHAT_WEBSOCKET_EVENTS.MESSAGE_REACTION, payload);
      this.server
        .to(data.receiverId)
        .emit(CHAT_WEBSOCKET_EVENTS.MESSAGE_REACTION, payload);

      this.logger.log(
        `[WS] Reaction broadcasted for message ${data.messageId}`,
      );
      return new UpdateReactionResponseDTO({
        success: true,
        reactions: result.reactions,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Reaction error: ${errorMessage}`);
      client.emit('error', { message: errorMessage });
    }
  }

  @SubscribeMessage(CHAT_WEBSOCKET_EVENTS.EDIT_MESSAGE)
  async handleEditMessage(
    client: Socket,
    data: EditMessageDTO,
  ): Promise<EditMessageResponseDTO | void> {
    if (!client.data.userId) {
      client.emit('error', { message: 'Unauthorized' });
      return;
    }

    if (!data?.messageId || typeof data.messageId !== 'string') {
      client.emit('error', { message: 'messageId is required' });
      return;
    }

    const trimmed = data.newContent?.trim();
    if (!trimmed || trimmed.length > CHAT.MAX_MESSAGE_LENGTH) {
      client.emit('error', {
        message: `Message must be 1–${CHAT.MAX_MESSAGE_LENGTH} characters`,
      });
      return;
    }

    try {
      const result = await firstValueFrom(
        this.chatServiceClient.send(CHAT_SERVICE.ACTIONS.EDIT_MESSAGE, {
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
        .emit(CHAT_WEBSOCKET_EVENTS.MESSAGE_EDITED, broadcastPayload);

      if (data.receiverId) {
        this.server
          .to(data.receiverId)
          .emit(CHAT_WEBSOCKET_EVENTS.MESSAGE_EDITED, broadcastPayload);
      }

      return result;
    } catch (error: any) {
      const errorMessage = error?.message || 'Unknown error';
      this.logger.error(`Edit message error: ${errorMessage}`);
      client.emit('error', { message: errorMessage });
    }
  }

  @SubscribeMessage(CHAT_WEBSOCKET_EVENTS.DELETE_MESSAGE)
  async handleDeleteMessage(
    client: Socket,
    data: DeleteMessageDTO,
  ): Promise<DeleteMessageResponseDTO | void> {
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
        this.chatServiceClient.send(CHAT_SERVICE.ACTIONS.DELETE_MESSAGE, {
          messageId: data.messageId,
          requesterId: client.data.userId,
        }),
      );

      const broadcastPayload = { messageId: data.messageId };

      this.server
        .to(client.data.userId)
        .emit(CHAT_WEBSOCKET_EVENTS.MESSAGE_DELETED, broadcastPayload);

      if (data.receiverId) {
        this.server
          .to(data.receiverId)
          .emit(CHAT_WEBSOCKET_EVENTS.MESSAGE_DELETED, broadcastPayload);
      }

      return result;
    } catch (error: any) {
      const errorMessage = error?.message || 'Unknown error';
      this.logger.error(`Delete message error: ${errorMessage}`);
      client.emit('error', { message: errorMessage });
    }
  }
}
