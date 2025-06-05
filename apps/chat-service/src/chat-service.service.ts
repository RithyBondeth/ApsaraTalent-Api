// apps/chat-service/src/chat.service.ts
import { Chat } from '@app/common/database/entities/chat.entity';
import { TChatContent } from '@app/common/interfaces/chat.interface';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class ChatServiceService {
  constructor(
    @InjectRepository(Chat) private readonly chatRepository: Repository<Chat>
  ) {}

  async createMessage(data: TChatContent) {
    const message = this.chatRepository.create({
      sender: { id: data.senderId },
      receiver: { id: data.receiverId },
      content: data.content,
      messageType: data.type
    });
    return this.chatRepository.save(message);
  }

  async markAsRead(data: { messageId: string, readerId: string }) {
    await this.chatRepository.update(
      { id: data.messageId, receiver: { id: data.readerId } },
      { isRead: true }
    );
  }
}