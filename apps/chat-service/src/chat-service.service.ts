// apps/chat-service/src/chat.service.ts
import { Chat } from '@app/common/database/entities/chat.entity';
import {
  IChatMessage,
  TChatContent,
} from '@app/common/interfaces/chat.interface';
import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import { firstValueFrom } from 'rxjs';
import { Repository } from 'typeorm';
import { USER_SERVICE } from 'utils/constants/user-service.constant';
import { User } from '@app/common/database/entities/user.entity';

import { Logger } from '@nestjs/common';

@Injectable()
export class ChatServiceService {
  private readonly logger = new Logger('ChatServiceService');

  constructor(
    @InjectRepository(Chat) private readonly chatRepository: Repository<Chat>,
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    @Inject(USER_SERVICE.NAME) private readonly userServiceClient: ClientProxy,
  ) {}

  /**
   * Resolves the User.id from any combination of:
   *  - a raw User UUID
   *  - an Employee UUID (looks up via employee join)
   *  - a Company UUID  (looks up via company join)
   */
  private async resolveUserId(id: string): Promise<string> {
    this.logger.debug(`Resolving ID: ${id}`);
    // Try direct User lookup first
    const byUserId = await this.userRepository.findOne({ where: { id } });
    if (byUserId) {
      this.logger.debug(`ID ${id} is directly a User PK`);
      return byUserId.id;
    }

    // Try to find via employee relation
    const byEmployee = await this.userRepository.findOne({
      where: { employee: { id } },
      relations: ['employee'],
    });
    if (byEmployee) return byEmployee.id;

    // Try to find via company relation
    const byCompany = await this.userRepository.findOne({
      where: { company: { id } },
      relations: ['company'],
    });
    if (byCompany) return byCompany.id;

    throw new RpcException({
      message: `Could not resolve user ID from: ${id}`,
      statusCode: 404,
    });
  }

  async createOrGetChat(data: { senderId: string; receiverId: string }) {
    try {
      // Resolve actual User PKs (handles employee/company IDs too)
      const senderUserId = await this.resolveUserId(data.senderId);
      const receiverUserId = await this.resolveUserId(data.receiverId);

      // Find partner profile early for a rich response
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
          '/avatars/default.png',
        email: partner.email,
        isRead: true, // New or existing, we assume read if just initiated
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
        return {
          ...partnerProfile,
          id: receiverUserId,
          chatId: existing.id,
          alreadyExists: true,
        };
      }

      const message = this.chatRepository.create({
        sender: { id: senderUserId },
        receiver: { id: receiverUserId },
        content: partnerProfile.preview,
        messageType: 'text',
      });

      const saved = await this.chatRepository.save(message);

      return {
        ...partnerProfile,
        id: receiverUserId,
        chatId: saved.id,
        alreadyExists: false,
      };
    } catch (error) {
      if (error instanceof RpcException) throw error;
      throw new RpcException({
        message: `Failed to create chat: ${(error as Error).message}`,
        statusCode: 500,
      });
    }
  }

  async createMessage(data: TChatContent): Promise<IChatMessage> {
    try {
      // Resolve actual User PKs
      const senderUserId = await this.resolveUserId(data.senderId);
      const receiverUserId = await this.resolveUserId(data.receiverId);

      this.logger.log(
        `Creating message: ${senderUserId} -> ${receiverUserId} (Original: ${data.senderId} -> ${data.receiverId})`,
      );

      const message = this.chatRepository.create({
        sender: { id: senderUserId },
        receiver: { id: receiverUserId },
        content: data.content,
        messageType: data.type || 'text',
      });

      const savedMessage = await this.chatRepository.save(message);

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

      return {
        id: chat.id,
        senderId: chat.sender?.id || data.senderId,
        receiverId: chat.receiver?.id || data.receiverId,
        content: chat.content,
        messageType: chat.messageType,
        isRead: chat.isRead,
        sentAt: chat.sentAt,
        reactions: chat.reactions || {},
        sender: {
          id: chat.sender?.id || data.senderId,
          name: senderEmp
            ? [senderEmp.firstname, senderEmp.lastname].filter(Boolean).join(' ')
            : senderCo?.name || 'Unknown',
          email: chat.sender?.email || '',
        },
        receiver: {
          id: chat.receiver?.id || data.receiverId,
          name: receiverEmp
            ? [receiverEmp.firstname, receiverEmp.lastname].filter(Boolean).join(' ')
            : receiverCo?.name || 'Unknown',
          email: chat.receiver?.email || '',
        },
      };
    } catch (error) {
      throw new RpcException({
        message: `Failed to create message: ${(error as Error).message}`,
        statusCode: 500,
      });
    }
  }

  async markAsRead(data: { messageId: string; readerId: string }) {
    const result = await this.chatRepository.update(
      {
        id: data.messageId,
        receiver: { id: data.readerId },
      },
      { isRead: true },
    );

    if (result.affected === 0) {
      throw new Error('Message not found or user not authorized');
    }

    return { success: true };
  }

  async getUserByIdForChat(userId: string) {
    return await firstValueFrom(
      this.userServiceClient.send(USER_SERVICE.ACTIONS.FIND_ONE_BY_ID, {
        userId,
      }),
    );
  }

  async validateChatUsers(senderId: string, receiverId: string) {
    // Resolve actual User PKs
    const senderUserId = await this.resolveUserId(senderId);
    const receiverUserId = await this.resolveUserId(receiverId);

    const [sender, receiver] = await Promise.all([
      this.getUserByIdForChat(senderUserId),
      this.getUserByIdForChat(receiverUserId),
    ]);

    if (!sender || !receiver)
      throw new RpcException({
        message: 'One or both users not found',
        statusCode: 400,
      });

    return {
      sender: sender,
      receiver: receiver,
    };
  }

  async getChatHistory(u1: string, u2: string, limit = 100, offset = 0) {
    const userId1 = await this.resolveUserId(u1);
    const userId2 = await this.resolveUserId(u2);

    this.logger.log(
      `Fetching history: ${userId1} <-> ${userId2} (Originals: ${u1}, ${u2})`,
    );

    // Build conditions to include both resolved PKs and original IDs (handles migration/legacy data)
    const conditions = [];

    // Direction 1: u1 -> u2
    conditions.push({ sender: { id: userId1 }, receiver: { id: userId2 } });
    if (userId2 !== u2)
      conditions.push({ sender: { id: userId1 }, receiver: { id: u2 } });
    if (userId1 !== u1)
      conditions.push({ sender: { id: u1 }, receiver: { id: userId2 } });
    if (userId1 !== u1 && userId2 !== u2)
      conditions.push({ sender: { id: u1 }, receiver: { id: u2 } });

    // Direction 2: u2 -> u1
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

    // Resolve partner profile for the frontend
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
      };
    });

    return {
      messages: formattedMessages,
      partnerId: userId2,
      partnerProfile: partner,
    };
  }

  async getUnreadCount(u: string) {
    const userId = await this.resolveUserId(u);
    return await this.chatRepository.count({
      where: {
        receiver: { id: userId },
        isRead: false,
      },
    });
  }

  async updateReaction(data: {
    messageId: string;
    userId: string;
    emoji: string | null;
  }) {
    const chat = await this.chatRepository.findOne({
      where: { id: data.messageId },
    });
    if (!chat) throw new Error('Message not found');

    const reactions = chat.reactions || {};
    if (data.emoji) {
      reactions[data.userId] = data.emoji;
    } else {
      delete reactions[data.userId];
    }

    await this.chatRepository.update(data.messageId, { reactions });
    return { success: true, reactions };
  }

  async getRecentChats(u: string) {
    const userId = await this.resolveUserId(u);
    this.logger.log(`Fetching recent chats for: ${userId} (Original: ${u})`);

    const conditions = [];
    conditions.push({ sender: { id: userId } });
    conditions.push({ receiver: { id: userId } });
    if (userId !== u) {
      conditions.push({ sender: { id: u } });
      conditions.push({ receiver: { id: u } });
    }

    return await this.chatRepository.find({
      where: conditions,
      relations: [
        'sender',
        'sender.employee',
        'sender.company',
        'receiver',
        'receiver.employee',
        'receiver.company',
      ],
      order: { sentAt: 'DESC' },
      take: 100,
    });
  }
}
