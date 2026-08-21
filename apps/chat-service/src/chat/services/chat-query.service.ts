import { Chat } from '@app/common/database/entities/chat.entity';
import { RedisService } from '@app/common/redis/redis.service';
import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import { PinoLogger } from 'nestjs-pino';
import { firstValueFrom } from 'rxjs';
import { Repository } from 'typeorm';
import { USER_SERVICE } from '@app/contracts/constants/service-actions/user-service.constant';
import { UserResponseDTO } from '@app/contracts';
import {
  GetChatHistoryResponseDTO,
  GetChatHistoryRpcDTO,
  GetRecentChatsResponseDTO,
  ValidateChatUsersDTO,
  ValidateChatUsersResponseDTO,
} from '@app/contracts/dtos/chat';

const UNREAD_COUNT_TTL = 15_000; // 15s
const RECENT_CHATS_TTL = 30_000; // 30s
import { CHAT } from '@app/contracts/constants/domain/chat.constant';
import { IChatQueryService } from '@app/contracts/interfaces/service/chat-service.interface';
import {
  generateRecentChatsKey,
  generateUnreadCountKey,
} from '@app/common/redis/redis-keys.util';
import { ChatIdentityService } from './chat-identity.service';

/**
 * Read side of chat: history, recent conversations, unread counts and
 * attachment access checks. Message and chat mutations live in ChatService.
 */
@Injectable()
export class ChatQueryService implements IChatQueryService {
  constructor(
    @InjectRepository(Chat) private readonly chatRepository: Repository<Chat>,
    @Inject(USER_SERVICE.NAME) private readonly userServiceClient: ClientProxy,
    private readonly redisService: RedisService,
    private readonly logger: PinoLogger,
    private readonly identity: ChatIdentityService,
  ) {
    this.logger.setContext(ChatQueryService.name);
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
    const senderUserId = await this.identity.resolveUserId(
      validateChatUsersDTO.senderId,
    );
    const receiverUserId = await this.identity.resolveUserId(
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
    const { userId1: u1, userId2: u2 } = getChatHistoryDTO;
    let { limit = CHAT.DEFAULT_HISTORY_LIMIT, offset = 0 } = getChatHistoryDTO;
    limit = Math.min(Math.max(1, limit), CHAT.MAX_HISTORY_LIMIT);
    offset = Math.min(Math.max(0, offset), CHAT.MAX_HISTORY_OFFSET);
    const userId1 = await this.identity.resolveUserId(u1);
    const userId2 = await this.identity.resolveUserId(u2);
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
    const userId = await this.identity.resolveUserId(u);
    const cacheKey = generateUnreadCountKey(userId);
    const cached = await this.redisService.get<number>(cacheKey);
    if (cached !== null && cached !== undefined) return cached;

    const count = await this.chatRepository.count({
      where: { receiver: { id: userId }, isRead: false },
    });
    await this.redisService.set(cacheKey, count, UNREAD_COUNT_TTL);
    return count;
  }

  async canAccessAttachment(
    userId: string,
    attachment: string,
  ): Promise<boolean> {
    if (!userId || !attachment) return false;

    const message = await this.chatRepository.findOne({
      where: { attachment },
      relations: ['sender', 'receiver'],
    });

    return Boolean(
      message &&
      (message.sender?.id === userId || message.receiver?.id === userId),
    );
  }

  async getRecentChats(u: string): Promise<GetRecentChatsResponseDTO[]> {
    const rawId = (u || '').trim();
    const candidateUserIds = new Set<string>();

    if (this.identity.isUuid(rawId)) {
      candidateUserIds.add(rawId);
    }

    const resolvedUserId = await this.identity.resolveUserIdSafe(rawId);
    if (resolvedUserId && this.identity.isUuid(resolvedUserId)) {
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
    const cacheKey = generateRecentChatsKey(cacheUserId);
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
