import { Chat } from '@app/common/database/entities/chat.entity';
import { EMessageType } from '@app/common/database/enums/message-type.enum';
import { RedisService } from '@app/common/redis/redis.service';
import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import { PinoLogger } from 'nestjs-pino';
import { Repository } from 'typeorm';
import { USER_SERVICE } from '@app/contracts/constants/service-actions/user-service.constant';
import { User } from '@app/common/database/entities/user.entity';
import { IChatService } from '@app/contracts/interfaces/service/chat-service.interface';
import { ChatIdentityService } from './chat-identity.service';
import {
  CreateMessageDTO,
  CreateMessageResponseDTO,
  CreateOrGetChatDTO,
  InitiateChatResponseDTO,
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
import {
  UpdateReactionResponseDTO,
  UpdateReactionRpcDTO,
} from '@app/contracts/dtos/chat/chat-gateway/update-reaction.dto';
import { generateUnreadCountKey } from '@app/common/redis/redis-keys.util';

@Injectable()
export class ChatService implements IChatService {
  constructor(
    @InjectRepository(Chat) private readonly chatRepository: Repository<Chat>,
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    @Inject(USER_SERVICE.NAME) private readonly userServiceClient: ClientProxy,
    private readonly redisService: RedisService,
    private readonly logger: PinoLogger,
    private readonly identity: ChatIdentityService,
  ) {
    this.logger.setContext(ChatService.name);
  }

  async createOrGetChat(
    createOrGetChatDTO: CreateOrGetChatDTO,
  ): Promise<InitiateChatResponseDTO> {
    try {
      const senderUserId = await this.identity.resolveUserId(
        createOrGetChatDTO.senderId,
      );
      const receiverUserId = await this.identity.resolveUserId(
        createOrGetChatDTO.receiverId,
      );
      await this.identity.assertNotBlocked(senderUserId, receiverUserId);
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
      const senderUserId = await this.identity.resolveUserId(
        createMessageDTO.senderId,
      );
      const receiverUserId = await this.identity.resolveUserId(
        createMessageDTO.receiverId,
      );
      await this.identity.assertNotBlocked(senderUserId, receiverUserId);
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
      if (error instanceof RpcException) throw error;
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
    const requesterUserId = await this.identity.resolveUserId(
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
    const requesterUserId = await this.identity.resolveUserId(
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
    await this.redisService.del(generateUnreadCountKey(markAsReadDTO.readerId));
    return new MarkAsReadResponseDTO({ success: true });
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
}
