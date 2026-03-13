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

@Injectable()
export class ChatServiceService {
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
    // Try direct User lookup first
    const byUserId = await this.userRepository.findOne({ where: { id } });
    if (byUserId) return byUserId.id;

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

  async createOrGetChat(senderId: string, receiverId: string) {
    try {
      // Resolve actual User PKs (handles employee/company IDs too)
      const senderUserId = await this.resolveUserId(senderId);
      const receiverUserId = await this.resolveUserId(receiverId);

      const existing = await this.chatRepository.findOne({
        where: [
          { sender: { id: senderUserId }, receiver: { id: receiverUserId } },
          { sender: { id: receiverUserId }, receiver: { id: senderUserId } },
        ],
      });

      if (existing) {
        return { chatId: existing.id, receiverUserId, alreadyExists: true };
      }

      const message = this.chatRepository.create({
        sender: { id: senderUserId },
        receiver: { id: receiverUserId },
        content: "👋 Let's chat!",
        messageType: 'text',
      });

      const saved = await this.chatRepository.save(message);
      return { chatId: saved.id, receiverUserId, alreadyExists: false };
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

  async getRecentChats(userId: string) {
    const query = this.chatRepository
      .createQueryBuilder('chat')
      .leftJoin('chat.sender', 'sender')
      .leftJoin('chat.receiver', 'receiver')
      .leftJoin('sender.employee', 'senderEmployee')
      .leftJoin('sender.company', 'senderCompany')
      .leftJoin('receiver.employee', 'receiverEmployee')
      .leftJoin('receiver.company', 'receiverCompany')
      .select([
        'chat.id',
        'chat.content',
        'chat.sentAt',
        'chat.isRead',
        'chat.reactions',
        // Sender base
        'sender.id',
        'sender.email',
        'sender.role',
        // Sender employee profile
        'senderEmployee.firstname',
        'senderEmployee.lastname',
        'senderEmployee.username',
        'senderEmployee.avatar',
        // Sender company profile
        'senderCompany.name',
        'senderCompany.avatar',
        // Receiver base
        'receiver.id',
        'receiver.email',
        'receiver.role',
        // Receiver employee profile
        'receiverEmployee.firstname',
        'receiverEmployee.lastname',
        'receiverEmployee.username',
        'receiverEmployee.avatar',
        // Receiver company profile
        'receiverCompany.name',
        'receiverCompany.avatar',
      ])
      .where('sender.id = :userId OR receiver.id = :userId', { userId })
      .orderBy('chat.sentAt', 'DESC')
      .limit(50);

    return await query.getMany();
  }
}
