import { Inject, Logger } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
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
import { SocketStateService } from '../services/socket-state.service';
import { ChatRateLimiterService } from '../services/chat-rate-limiter.service';
import { ChatNotificationService } from '../services/chat-notification.service';
import { SocketBroadcastService } from '../../shared/socket/socket-broadcast.service';
import { ChatMessageService } from '../services/chat-message.service';
import { ChatMatchGuardService } from '../services/chat-match-guard.service';
import { extractChatToken } from '../utils/chat-token.util';
import { IChatGateway } from '@app/contracts/interfaces/gateway/chat-gateway.interface';
import { rpcCall } from '../../utils/rpc-call';
import { GetUnreadCountResponseDTO } from '@app/contracts/dtos/chat/chat-gateway/get-unread-count.dto';
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
import { isOriginAllowed } from '@app/common';
import {
  validateEditMessage,
  validateSendMessage,
} from '../utils/chat-payload.util';

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
export class ChatGateway
  implements
    OnGatewayConnection,
    OnGatewayDisconnect,
    OnGatewayInit,
    IChatGateway
{
  @WebSocketServer() server: Server;
  private logger = new Logger('ChatGateway');

  private readonly VALID_MESSAGE_TYPES = Object.values(EMessageType);

  constructor(
    private readonly jwtService: JwtService,
    private readonly socketStateService: SocketStateService,
    private readonly chatRateLimiterService: ChatRateLimiterService,
    private readonly chatNotificationService: ChatNotificationService,
    private readonly socketBroadcastService: SocketBroadcastService,
    private readonly chatMessageService: ChatMessageService,
    @Inject(CHAT_SERVICE.NAME) private readonly chatServiceClient: ClientProxy,
    private readonly chatMatchGuard: ChatMatchGuardService,
  ) {}

  afterInit(server: Server): void {
    this.socketBroadcastService.setServer(server);
  }

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

      const isNewOnline = this.socketStateService.addSocket(
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

    const isFullyOffline = this.socketStateService.removeSocket(
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
      result[id] = this.socketStateService.isOnline(id);
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
    sendMessageDTO: SendMessageDTO,
  ): Promise<SendMessageResponseDTO | void> {
    this.logger.log(
      `[WS] sendMessage received from userId=${client.data.userId}, receiverId=${sendMessageDTO?.receiverId}, content.length=${sendMessageDTO?.content?.length}`,
    );
    try {
      if (!client.data.userId) {
        client.emit('error', { message: 'Unauthorized' });
        return;
      }

      if (this.chatRateLimiterService.isRateLimited(client.data.userId)) {
        client.emit('error', { message: 'Too many messages — slow down' });
        return;
      }

      const invalid = validateSendMessage(
        sendMessageDTO,
        this.VALID_MESSAGE_TYPES,
      );
      if (invalid) {
        client.emit('error', { message: invalid });
        return;
      }

      /*
        The match check the HTTP path does, on the path that actually carries
        messages. Gating only `POST /chat/initiate` would have been decorative:
        nothing requires a client to call it before emitting sendMessage, so
        this event was the real hole.

        Emitted as an error frame rather than thrown — an exception here tears
        down the socket instead of telling the sender why.
      */
      const matched = await this.chatMatchGuard.areMatched(
        client.data.userId,
        sendMessageDTO.receiverId,
      );
      if (!matched) {
        client.emit('error', {
          message: 'You can only message someone you have matched with.',
        });
        return;
      }

      const trimmedContent = sendMessageDTO?.content?.trim() ?? '';
      const hasAttachment = !!sendMessageDTO?.attachment;
      const messageType = sendMessageDTO.type ?? 'text';

      const { usersData, savedMessage } =
        await this.chatMessageService.sendMessage(
          client.data.userId,
          sendMessageDTO,
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

      void this.chatNotificationService.notifyChatMessage(this.server, {
        senderId: usersData.sender.id,
        receiverId: usersData.receiver.id,
        messageType,
        content: trimmedContent,
        hasAttachment,
        attachmentFilename: sendMessageDTO.attachmentFilename ?? null,
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
      const chats = await rpcCall<any[]>(
        this.chatServiceClient,
        CHAT_SERVICE.ACTIONS.GET_RECENT_CHATS,
        userId,
      );
      return chats.map(
        (chat: GetRecentChatsResponseDTO) =>
          new GetRecentChatsResponseDTO(chat),
      );
    } catch (error: any) {
      this.logger.error(`getRecentChats error: ${error?.message || 'Unknown'}`);
      return [];
    }
  }

  @SubscribeMessage(CHAT_WEBSOCKET_EVENTS.GET_CHAT_HISTORY)
  async handleGetChatHistory(
    client: Socket,
    getChatHistoryDTO: GetChatHistoryDTO,
  ): Promise<GetChatHistoryResponseDTO> {
    const userId1 = client.data.userId;
    try {
      this.logger.log(
        `[WS] Fetching history: user1=${userId1}, user2=${getChatHistoryDTO.partnerId}`,
      );
      const history = await rpcCall<any>(
        this.chatServiceClient,
        CHAT_SERVICE.ACTIONS.GET_CHAT_HISTORY,
        {
          userId1,
          userId2: getChatHistoryDTO.partnerId,
          limit: Math.min(
            Math.max(1, getChatHistoryDTO.limit || CHAT.DEFAULT_HISTORY_LIMIT),
            CHAT.MAX_HISTORY_LIMIT,
          ),
          offset: Math.min(
            Math.max(0, getChatHistoryDTO.offset || 0),
            CHAT.MAX_HISTORY_OFFSET,
          ),
        },
      );
      return new GetChatHistoryResponseDTO(history);
    } catch (error: any) {
      this.logger.error(`getChatHistory error: ${error?.message || 'Unknown'}`);
      return new GetChatHistoryResponseDTO({
        messages: [],
        partnerId: getChatHistoryDTO.partnerId,
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
      const count = await rpcCall<number>(
        this.chatServiceClient,
        CHAT_SERVICE.ACTIONS.GET_UNREAD_COUNT,
        userId,
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
    markAsReadDTO: MarkAsReadDTO,
  ): Promise<MarkAsReadResponseDTO | void> {
    try {
      if (!client.data.userId) {
        client.emit('error', { message: 'Unauthorized' });
        return;
      }

      const messageId =
        typeof markAsReadDTO === 'string'
          ? markAsReadDTO
          : markAsReadDTO?.messageId;
      const senderId =
        typeof markAsReadDTO === 'object' ? markAsReadDTO?.senderId : undefined;

      if (!messageId || typeof messageId !== 'string') {
        client.emit('error', { message: 'Message ID required' });
        return;
      }

      await rpcCall<MarkAsReadResponseDTO>(
        this.chatServiceClient,
        CHAT_SERVICE.ACTIONS.MARK_MESSAGE_READ,
        {
          messageId,
          readerId: client.data.userId,
        },
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
  async handleTyping(client: Socket, typingDTO: TypingDTO): Promise<void> {
    if (!typingDTO?.receiverId || typeof typingDTO.isTyping !== 'boolean') {
      client.emit('error', { message: 'Invalid typing payload' });
      return;
    }
    try {
      this.server
        .to(typingDTO.receiverId)
        .emit(CHAT_WEBSOCKET_EVENTS.USER_TYPING, {
          userId: client.data.userId,
          isTyping: typingDTO.isTyping,
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
    updateReactionDTO: UpdateReactionDTO,
  ): Promise<UpdateReactionResponseDTO | void> {
    try {
      this.logger.log(
        `[WS] Reaction received: messageId=${updateReactionDTO.messageId}, userId=${client.data.userId}, emoji=${updateReactionDTO.emoji}`,
      );

      const result = await rpcCall<UpdateReactionResponseDTO>(
        this.chatServiceClient,
        CHAT_SERVICE.ACTIONS.UPDATE_REACTION,
        {
          messageId: updateReactionDTO.messageId,
          userId: client.data.userId,
          emoji: updateReactionDTO.emoji,
        },
      );

      const payload = {
        messageId: updateReactionDTO.messageId,
        reactions: result.reactions,
      };

      this.server
        .to(client.data.userId)
        .emit(CHAT_WEBSOCKET_EVENTS.MESSAGE_REACTION, payload);
      this.server
        .to(updateReactionDTO.receiverId)
        .emit(CHAT_WEBSOCKET_EVENTS.MESSAGE_REACTION, payload);

      this.logger.log(
        `[WS] Reaction broadcasted for message ${updateReactionDTO.messageId}`,
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
    editMessageDTO: EditMessageDTO,
  ): Promise<EditMessageResponseDTO | void> {
    if (!client.data.userId) {
      client.emit('error', { message: 'Unauthorized' });
      return;
    }

    const invalidEdit = validateEditMessage(editMessageDTO);
    if (invalidEdit) {
      client.emit('error', { message: invalidEdit });
      return;
    }
    const trimmed = editMessageDTO.newContent!.trim();

    try {
      const result = await rpcCall<EditMessageResponseDTO>(
        this.chatServiceClient,
        CHAT_SERVICE.ACTIONS.EDIT_MESSAGE,
        {
          messageId: editMessageDTO.messageId,
          requesterId: client.data.userId,
          newContent: trimmed,
        },
      );

      const broadcastPayload = {
        messageId: editMessageDTO.messageId,
        newContent: trimmed,
        isEdited: true,
      };

      this.server
        .to(client.data.userId)
        .emit(CHAT_WEBSOCKET_EVENTS.MESSAGE_EDITED, broadcastPayload);

      if (editMessageDTO.receiverId) {
        this.server
          .to(editMessageDTO.receiverId)
          .emit(CHAT_WEBSOCKET_EVENTS.MESSAGE_EDITED, broadcastPayload);
      }

      return new EditMessageResponseDTO(result);
    } catch (error: any) {
      const errorMessage = error?.message || 'Unknown error';
      this.logger.error(`Edit message error: ${errorMessage}`);
      client.emit('error', { message: errorMessage });
    }
  }

  @SubscribeMessage(CHAT_WEBSOCKET_EVENTS.DELETE_MESSAGE)
  async handleDeleteMessage(
    client: Socket,
    deleteMessageDTO: DeleteMessageDTO,
  ): Promise<DeleteMessageResponseDTO | void> {
    if (!client.data.userId) {
      client.emit('error', { message: 'Unauthorized' });
      return;
    }

    if (
      !deleteMessageDTO?.messageId ||
      typeof deleteMessageDTO.messageId !== 'string'
    ) {
      client.emit('error', { message: 'messageId is required' });
      return;
    }

    try {
      const result = await rpcCall<any>(
        this.chatServiceClient,
        CHAT_SERVICE.ACTIONS.DELETE_MESSAGE,
        {
          messageId: deleteMessageDTO.messageId,
          requesterId: client.data.userId,
        },
      );

      const broadcastPayload = { messageId: deleteMessageDTO.messageId };

      this.server
        .to(client.data.userId)
        .emit(CHAT_WEBSOCKET_EVENTS.MESSAGE_DELETED, broadcastPayload);

      if (deleteMessageDTO.receiverId) {
        this.server
          .to(deleteMessageDTO.receiverId)
          .emit(CHAT_WEBSOCKET_EVENTS.MESSAGE_DELETED, broadcastPayload);
      }

      return new DeleteMessageResponseDTO(result);
    } catch (error: any) {
      const errorMessage = error?.message || 'Unknown error';
      this.logger.error(`Delete message error: ${errorMessage}`);
      client.emit('error', { message: errorMessage });
    }
  }
}
