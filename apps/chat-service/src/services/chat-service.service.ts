import { Chat } from '@app/common/database/entities/chat.entity';
import { EMessageType } from '@app/common/database/enums/message-type.enum';
import { RedisService } from '@app/common/redis/redis.service';
import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import { PinoLogger } from 'nestjs-pino';
import { firstValueFrom } from 'rxjs';
import { Repository } from 'typeorm';
import { USER_SERVICE } from '@app/contracts/constants/service-actions/user-service.constant';
import { User } from '@app/common/database/entities/user.entity';
import { isUuid, resolveUserId, resolveUserIdSafe } from '@app/common';
import { IChatService } from '@app/contracts/interfaces/service/chat-service.interface';
import {
  CreateMessageDTO,
  CreateMessageResponseDTO,
  CreateOrGetChatDTO,
  GetChatHistoryResponseDTO,
  GetChatHistoryRpcDTO,
  GetRecentChatsResponseDTO,
  InitiateChatResponseDTO,
  ValidateChatUsersDTO,
  ValidateChatUsersResponseDTO,
} from '@app/contracts/dtos/chat';
import { CHAT } from '@app/contracts/constants/domain/chat.constant';
import {
  EditMessageResponseDTO,
  EditMessageRpcDTO,
} from '@app/contracts/dtos/chat/chat-gateway/edit-message.dto';
import {
  DeleteMessageResponseDTO,
  DeleteMessageRpcDTO,
} from '@app/contracts/dtos/chat/chat-gateway/delete-message.dto';
import {
  MarkAsReadResponseDTO,
  MarkAsReadRpcDTO,
} from '@app/contracts/dtos/chat/chat-gateway/mark-as-read.dto';
import { UserResponseDTO } from '@app/contracts';
import {
  UpdateReactionResponseDTO,
  UpdateReactionRpcDTO,
} from '@app/contracts/dtos/chat/chat-gateway/update-reaction.dto';

const UNREAD_COUNT_TTL = 15_000; // 15s
const RECENT_CHATS_TTL = 30_000; // 30s

@Injectable()
export class ChatService implements IChatService {
  constructor(
    @InjectRepository(Chat) private readonly chatRepository: Repository<Chat>,
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    @Inject(USER_SERVICE.NAME) private readonly userServiceClient: ClientProxy,
    private readonly redisService: RedisService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(ChatService.name);
  }

  /**
   * Resolves the User.id from any combination of:
   *  - a raw User UUID
   *  - an Employee UUID (looks up via employee join)
   *  - a Company UUID  (looks up via company join)
   */
  private async resolveUserId(id: string): Promise<string> {
    try {
      this.logger.debug(`Resolving ID: ${id}`);
      return await resolveUserId(this.userRepository, id);
    } catch (error) {
      throw new RpcException({
        message: `Could not resolve user ID from: ${id}`,
        statusCode: 404,
      });
    }
  }

  private isUuid(value: string): boolean {
    return isUuid(value);
  }

  private async resolveUserIdSafe(id: string): Promise<string | null> {
    const result = await resolveUserIdSafe(this.userRepository, id);
    if (!result) {
      this.logger.warn(`resolveUserIdSafe failed for "${id}"`);
    }
    return result;
  }

  async createOrGetChat(
    createOrGetChatDTO: CreateOrGetChatDTO,
  ): Promise<InitiateChatResponseDTO> {
    try {
      const senderUserId = await this.resolveUserId(
        createOrGetChatDTO.senderId,
      );
      const receiverUserId = await this.resolveUserId(
        createOrGetChatDTO.receiverId,
      );
      const partner = await this.userRepository.findOne({
        where: { id: receiverUserId },
        relations: ['employee', 'company'],
      });
      if (!partner) throw new Error('Partner user not found');
      const pEmp = partner.employee;
      const partnerProfile = {
        id: partner.id,
        name: pEmp
          ? [pEmp.firstname, pEmp.lastname].filter(Boolean).join(' ')
          : partner.company?.name || 'Unknown',
        avatar:
          partner.employee?.avatar ||
          partner.company?.avatar ||
          CHAT.DEFAULT_AVATAR_PATH,
        email: partner.email,
        isRead: true,
        preview: "👋 Let's chat!",
        time: 'Just now',
      };
      const existing = await this.chatRepository.findOne({
        where: [
          { sender: { id: senderUserId }, receiver: { id: receiverUserId } },
          { sender: { id: receiverUserId }, receiver: { id: senderUserId } },
        ],
      });
      if (existing) {
        return new InitiateChatResponseDTO({
          ...partnerProfile,
          id: receiverUserId,
          chatId: existing.id,
          alreadyExists: true,
        });
      }
      const message = this.chatRepository.create({
        sender: { id: senderUserId },
        receiver: { id: receiverUserId },
        content: partnerProfile.preview,
        messageType: EMessageType.TEXT,
      });
      const saved = await this.chatRepository.save(message);
      // Invalidate recent-chats for both participants
      await this.redisService.invalidateChatCaches(
        senderUserId,
        receiverUserId,
      );
      return new InitiateChatResponseDTO({
        ...partnerProfile,
        id: receiverUserId,
        chatId: saved.id,
        alreadyExists: false,
      });
    } catch (error) {
      if (error instanceof RpcException) throw error;
      throw new RpcException({
        message: `Failed to create chat: ${(error as Error).message}`,
        statusCode: 500,
      });
    }
  }

  async createMessage(
    createMessageDTO: CreateMessageDTO & { senderId: string },
  ): Promise<CreateMessageResponseDTO> {
    try {
      const senderUserId = await this.resolveUserId(createMessageDTO.senderId);
      const receiverUserId = await this.resolveUserId(
        createMessageDTO.receiverId,
      );
      this.logger.info(
        `Creating message: ${senderUserId} -> ${receiverUserId}`,
      );

      // Build entity — store replyToId and attachment if provided
      const message = this.chatRepository.create({
        sender: { id: senderUserId },
        receiver: { id: receiverUserId },
        content: createMessageDTO.content,
        messageType:
          (createMessageDTO.type as EMessageType) || EMessageType.TEXT,
        replyToId: createMessageDTO.replyToId ?? null,
        attachment: createMessageDTO.attachment ?? null,
        attachmentFilename: createMessageDTO.attachmentFilename ?? null,
        attachmentDuration: createMessageDTO.attachmentDuration ?? null,
        attachmentAmplitude: createMessageDTO.attachmentAmplitude ?? null,
      });
      const savedMessage = await this.chatRepository.save(message);
      // Invalidate recent-chats and unread count for both participants
      await this.redisService.invalidateChatCaches(
        senderUserId,
        receiverUserId,
      );
      const chat = await this.chatRepository.findOne({
        where: { id: savedMessage.id },
        relations: [
          'sender',
          'sender.employee',
          'sender.company',
          'receiver',
          'receiver.employee',
          'receiver.company',
        ],
      });
      if (!chat) throw new Error('Failed to retrieve saved message');
      const senderEmp = chat.sender?.employee;
      const senderCo = chat.sender?.company;
      const receiverEmp = chat.receiver?.employee;
      const receiverCo = chat.receiver?.company;
      return new CreateMessageResponseDTO({
        id: chat.id,
        senderId: chat.sender?.id || createMessageDTO.senderId,
        receiverId: chat.receiver?.id || createMessageDTO.receiverId,
        content: chat.content,
        messageType: chat.messageType,
        isRead: chat.isRead,
        sentAt: chat.sentAt,
        reactions: chat.reactions || {},
        isDeleted: chat.isDeleted,
        isEdited: chat.isEdited,
        replyToId: chat.replyToId ?? null,
        attachment: chat.attachment ?? null,
        // Derive attachment display metadata for the frontend
        attachmentType:
          chat.messageType === 'image'
            ? 'image'
            : chat.messageType === 'document'
              ? 'document'
              : chat.messageType === 'audio'
                ? 'audio'
                : undefined,
        attachmentFilename: chat.attachmentFilename ?? undefined,
        attachmentDuration: chat.attachmentDuration ?? null,
        attachmentAmplitude: chat.attachmentAmplitude ?? null,
        sender: {
          id: chat.sender?.id || createMessageDTO.senderId,
          name: senderEmp
            ? [senderEmp.firstname, senderEmp.lastname]
                .filter(Boolean)
                .join(' ')
            : senderCo?.name || 'Unknown',
          email: chat.sender?.email || '',
        },
        receiver: {
          id: chat.receiver?.id || createMessageDTO.receiverId,
          name: receiverEmp
            ? [receiverEmp.firstname, receiverEmp.lastname]
                .filter(Boolean)
                .join(' ')
            : receiverCo?.name || 'Unknown',
          email: chat.receiver?.email || '',
        },
      });
    } catch (error) {
      throw new RpcException({
        message: `Failed to create message: ${(error as Error).message}`,
        statusCode: 500,
      });
    }
  }

  async editMessage(
    editMessageDTO: EditMessageRpcDTO,
  ): Promise<EditMessageResponseDTO> {
    // Resolve canonical User PK (handles employee / company IDs)
    const requesterUserId = await this.resolveUserId(
      editMessageDTO.requesterId,
    );

    // Validate new content: must be a non-empty string ≤ 5000 chars
    const trimmed = editMessageDTO.newContent?.trim();
    if (!trimmed || trimmed.length > CHAT.MAX_MESSAGE_LENGTH) {
      throw new RpcException({
        message: `Message content must be 1–${CHAT.MAX_MESSAGE_LENGTH} characters`,
        statusCode: 400,
      });
    }

    // Fetch message with both relations so we can check ownership and get receiverId
    const message = await this.chatRepository.findOne({
      where: { id: editMessageDTO.messageId },
      relations: ['sender', 'receiver'],
    });

    if (!message) {
      throw new RpcException({ message: 'Message not found', statusCode: 404 });
    }

    // Only the original sender may edit their own message
    if (message.sender?.id !== requesterUserId) {
      throw new RpcException({
        message: 'Not authorized to edit this message',
        statusCode: 403,
      });
    }

    // Guard: a deleted message (tombstone) cannot be edited back to life
    if (message.isDeleted) {
      throw new RpcException({
        message: 'Cannot edit a deleted message',
        statusCode: 400,
      });
    }

    // Persist the edit: update content and set the isEdited flag
    await this.chatRepository.update(editMessageDTO.messageId, {
      content: trimmed,
      isEdited: true,
    });

    this.logger.info(
      `[CHAT] Message ${editMessageDTO.messageId} edited by ${requesterUserId}`,
    );

    // Return the payload needed for the gateway to broadcast the change
    return new EditMessageResponseDTO({
      success: true,
      messageId: editMessageDTO.messageId,
      newContent: trimmed,
      senderId: message.sender.id,
      receiverId: message.receiver?.id ?? null,
    });
  }

  async deleteMessage(
    deleteMessageDTO: DeleteMessageRpcDTO,
  ): Promise<DeleteMessageResponseDTO> {
    const requesterUserId = await this.resolveUserId(
      deleteMessageDTO.requesterId,
    );
    const message = await this.chatRepository.findOne({
      where: { id: deleteMessageDTO.messageId },
      relations: ['sender', 'receiver'],
    });
    if (!message) {
      throw new RpcException({ message: 'Message not found', statusCode: 404 });
    }
    if (message.sender?.id !== requesterUserId) {
      throw new RpcException({
        message: 'Not authorized to delete this message',
        statusCode: 403,
      });
    }
    await this.chatRepository.update(deleteMessageDTO.messageId, {
      isDeleted: true,
    });
    this.logger.info(
      `[CHAT] Message ${deleteMessageDTO.messageId} soft-deleted by ${requesterUserId}`,
    );
    return new DeleteMessageResponseDTO({
      success: true,
      messageId: deleteMessageDTO.messageId,
      senderId: message.sender.id,
      receiverId: message.receiver?.id ?? null,
    });
  }

  async markAsRead(
    markAsReadDTO: MarkAsReadRpcDTO,
  ): Promise<MarkAsReadResponseDTO> {
    const result = await this.chatRepository.update(
      { id: markAsReadDTO.messageId, receiver: { id: markAsReadDTO.readerId } },
      { isRead: true },
    );
    if (result.affected === 0) {
      throw new Error('Message not found or user not authorized');
    }
    // Invalidate unread count for the reader
    await this.redisService.del(
      this.redisService.generateUnreadCountKey(markAsReadDTO.readerId),
    );
    return new MarkAsReadResponseDTO({ success: true });
  }

  async getUserByIdForChat(userId: string): Promise<UserResponseDTO> {
    const user = await firstValueFrom(
      this.userServiceClient.send(USER_SERVICE.ACTIONS.FIND_ONE_BY_ID, {
        userId,
      }),
    );
    return new UserResponseDTO(user);
  }

  async validateChatUsers(
    validateChatUsersDTO: ValidateChatUsersDTO,
  ): Promise<ValidateChatUsersResponseDTO> {
    const senderUserId = await this.resolveUserId(
      validateChatUsersDTO.senderId,
    );
    const receiverUserId = await this.resolveUserId(
      validateChatUsersDTO.receiverId,
    );
    const [sender, receiver] = await Promise.all([
      this.getUserByIdForChat(senderUserId),
      this.getUserByIdForChat(receiverUserId),
    ]);
    if (!sender || !receiver)
      throw new RpcException({
        message: 'One or both users not found',
        statusCode: 400,
      });
    return new ValidateChatUsersResponseDTO({ sender, receiver });
  }

  async getChatHistory(
    getChatHistoryDTO: GetChatHistoryRpcDTO,
  ): Promise<GetChatHistoryResponseDTO> {
    let {
      userId1: u1,
      userId2: u2,
      limit = CHAT.DEFAULT_HISTORY_LIMIT,
      offset = 0,
    } = getChatHistoryDTO;
    limit = Math.min(Math.max(1, limit), CHAT.MAX_HISTORY_LIMIT);
    offset = Math.min(Math.max(0, offset), CHAT.MAX_HISTORY_OFFSET);
    const userId1 = await this.resolveUserId(u1);
    const userId2 = await this.resolveUserId(u2);
    this.logger.info(`Fetching history: ${userId1} <-> ${userId2}`);

    const conditions = [];
    conditions.push({ sender: { id: userId1 }, receiver: { id: userId2 } });
    if (userId2 !== u2)
      conditions.push({ sender: { id: userId1 }, receiver: { id: u2 } });
    if (userId1 !== u1)
      conditions.push({ sender: { id: u1 }, receiver: { id: userId2 } });
    if (userId1 !== u1 && userId2 !== u2)
      conditions.push({ sender: { id: u1 }, receiver: { id: u2 } });
    conditions.push({ sender: { id: userId2 }, receiver: { id: userId1 } });
    if (userId2 !== u2)
      conditions.push({ sender: { id: u2 }, receiver: { id: userId1 } });
    if (userId1 !== u1)
      conditions.push({ sender: { id: userId2 }, receiver: { id: u1 } });
    if (userId1 !== u1 && userId2 !== u2)
      conditions.push({ sender: { id: u2 }, receiver: { id: u1 } });

    const messages = await this.chatRepository.find({
      where: conditions,
      relations: [
        'sender',
        'sender.employee',
        'sender.company',
        'receiver',
        'receiver.employee',
        'receiver.company',
      ],
      order: { sentAt: 'ASC' },
      take: limit,
      skip: offset,
    });

    const partner = await this.getUserByIdForChat(userId2);

    const formattedMessages = messages.map((msg) => {
      const sEmp = msg.sender?.employee;
      const sCo = msg.sender?.company;
      return {
        id: msg.id,
        senderId: msg.sender?.id,
        receiverId: msg.receiver?.id,
        senderName: sEmp
          ? [sEmp.firstname, sEmp.lastname].filter(Boolean).join(' ')
          : sCo?.name || 'Unknown',
        content: msg.content,
        messageType: msg.messageType,
        isRead: msg.isRead,
        sentAt: msg.sentAt,
        reactions: msg.reactions || {},
        // All metadata fields passed to frontend
        isDeleted: msg.isDeleted,
        isEdited: msg.isEdited,
        replyToId: msg.replyToId ?? null,
        attachment: msg.attachment ?? null,
        // Derive attachmentType from messageType so the frontend knows how to render it
        // ('image' → inline preview; 'document' → download card)
        attachmentType:
          msg.messageType === 'image'
            ? 'image'
            : msg.messageType === 'document'
              ? 'document'
              : msg.messageType === 'audio'
                ? 'audio'
                : undefined,
        attachmentFilename: msg.attachmentFilename ?? undefined,
        attachmentDuration: msg.attachmentDuration ?? null,
        attachmentAmplitude: msg.attachmentAmplitude ?? null,
      };
    });

    return new GetChatHistoryResponseDTO({
      messages: formattedMessages,
      partnerId: userId2,
      partnerProfile: partner,
    });
  }

  async getUnreadCount(u: string): Promise<number> {
    const userId = await this.resolveUserId(u);
    const cacheKey = this.redisService.generateUnreadCountKey(userId);
    const cached = await this.redisService.get<number>(cacheKey);
    if (cached !== null && cached !== undefined) return cached;

    const count = await this.chatRepository.count({
      where: { receiver: { id: userId }, isRead: false },
    });
    await this.redisService.set(cacheKey, count, UNREAD_COUNT_TTL);
    return count;
  }

  async updateReaction(
    updateReactionDTO: UpdateReactionRpcDTO,
  ): Promise<UpdateReactionResponseDTO> {
    const chat = await this.chatRepository.findOne({
      where: { id: updateReactionDTO.messageId },
    });
    if (!chat) throw new Error('Message not found');
    const reactions = chat.reactions || {};
    if (updateReactionDTO.emoji) {
      reactions[updateReactionDTO.userId] = updateReactionDTO.emoji;
    } else {
      delete reactions[updateReactionDTO.userId];
    }
    await this.chatRepository.update(updateReactionDTO.messageId, {
      reactions,
    });
    return new UpdateReactionResponseDTO({ success: true, reactions });
  }

  async getRecentChats(u: string): Promise<GetRecentChatsResponseDTO[]> {
    const rawId = (u || '').trim();
    const candidateUserIds = new Set<string>();

    if (this.isUuid(rawId)) {
      candidateUserIds.add(rawId);
    }

    const resolvedUserId = await this.resolveUserIdSafe(rawId);
    if (resolvedUserId && this.isUuid(resolvedUserId)) {
      candidateUserIds.add(resolvedUserId);
    }

    const userIds = Array.from(candidateUserIds);
    if (userIds.length === 0) {
      this.logger.warn(
        `getRecentChats: no valid userId could be resolved for "${u}"`,
      );
      return [];
    }

    // Use the resolved user ID (most canonical) as cache key
    const cacheUserId = resolvedUserId || rawId;
    const cacheKey = this.redisService.generateRecentChatsKey(cacheUserId);
    const cached = await this.redisService.get<any[]>(cacheKey);
    if (cached) return cached;

    this.logger.info(
      `Fetching recent chats for candidates: ${userIds.join(', ')} (original: ${u})`,
    );

    const result = await this.chatRepository
      .createQueryBuilder('chat')
      .leftJoinAndSelect('chat.sender', 'sender')
      .leftJoinAndSelect('sender.employee', 'senderEmployee')
      .leftJoinAndSelect('sender.company', 'senderCompany')
      .leftJoinAndSelect('chat.receiver', 'receiver')
      .leftJoinAndSelect('receiver.employee', 'receiverEmployee')
      .leftJoinAndSelect('receiver.company', 'receiverCompany')
      .where('sender.id IN (:...userIds)', { userIds })
      .orWhere('receiver.id IN (:...userIds)', { userIds })
      .orderBy('chat.sentAt', 'DESC')
      .addOrderBy('chat.id', 'ASC')
      .take(CHAT.MAX_RECENT_CHATS)
      .getMany();

    await this.redisService.set(cacheKey, result, RECENT_CHATS_TTL);
    return result.map((chat) => new GetRecentChatsResponseDTO(chat));
  }
}
