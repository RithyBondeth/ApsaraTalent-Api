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

@Injectable()
export class ChatServiceService {
  constructor(
    @InjectRepository(Chat) private readonly chatRepository: Repository<Chat>,
    @Inject(USER_SERVICE.NAME) private readonly userServiceClient: ClientProxy,
  ) {}

  async createOrGetChat(senderId: string, receiverId: string) {
    const existing = await this.chatRepository.findOne({
      where: [
        { sender: { id: senderId }, receiver: { id: receiverId } },
        { sender: { id: receiverId }, receiver: { id: senderId } },
      ],
    });

    if (existing) {
      return { chatId: existing.id, alreadyExists: true };
    }

    const message = this.chatRepository.create({
      sender: { id: senderId },
      receiver: { id: receiverId },
      content: "👋 Let's chat!", // initial message
      messageType: 'text',
    });

    const saved = await this.chatRepository.save(message);
    return { chatId: saved.id, alreadyExists: false };
  }

  async createMessage(data: TChatContent): Promise<IChatMessage> {
    try {
      const message = this.chatRepository.create({
        sender: { id: data.senderId },
        receiver: { id: data.receiverId },
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

      return {
        id: chat.id,
        senderId: chat.sender.id,
        receiverId: chat.receiver.id,
        content: chat.content,
        messageType: chat.messageType,
        isRead: chat.isRead,
        sendAt: chat.sentAt,
        sender: {
          id: chat.sender.id,
          name:
            chat.sender.employee?.username ||
            chat.sender.company?.name ||
            'Unknown',
          email: chat.sender.email,
        },
        receiver: {
          id: chat.receiver.id,
          name:
            chat.receiver.employee?.username ||
            chat.receiver.company?.name ||
            'Unknown',
          email: chat.receiver.email,
        },
      };
    } catch (error) {
      throw new RpcException({
        message: `Failed to create message: ${error.message}`,
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
      this.userServiceClient.send(USER_SERVICE.ACTIONS.FIND_ONE_BY_ID, userId),
    );
  }

  async validateChatUsers(senderId: string, receiverId: string) {
    const [sender, receiver] = await Promise.all([
      this.getUserByIdForChat(senderId),
      this.getUserByIdForChat(receiverId),
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

  async getChatHistory(
    userId1: string,
    userId2: string,
    limit = 50,
    offset = 0,
  ) {
    return await this.chatRepository.find({
      where: [
        { sender: { id: userId1 }, receiver: { id: userId2 } },
        { sender: { id: userId2 }, receiver: { id: userId1 } },
      ],
      relations: ['sender', 'receiver'],
      order: { sentAt: 'DESC' },
      take: limit,
      skip: offset,
    });
  }

  async getUnreadCount(userId: string) {
    return await this.chatRepository.count({
      where: {
        receiver: { id: userId },
        isRead: false,
      },
    });
  }

  async getRecentChats(userId: string) {
    const query = this.chatRepository
      .createQueryBuilder('chat')
      .leftJoin('chat.sender', 'sender')
      .leftJoin('chat.receiver', 'receiver')
      .select([
        'chat.id',
        'chat.content',
        'chat.sendAt',
        'chat.isRead',
        'sender.id',
        'sender.email',
        'receiver.id',
        'receiver.email',
      ])
      .where('chat.sender.id = :userId OR chat.receiver.id = :userId', {
        userId,
      })
      .orderBy('chat.createdAt', 'DESC')
      .limit(20);

    return await query.getMany();
  }
}
