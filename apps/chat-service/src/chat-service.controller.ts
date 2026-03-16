import { TChatContent } from '@app/common/interfaces/chat.interface';
import { Controller, Logger } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { ChatServiceService } from './chat-service.service';

@Controller()
export class ChatServiceController {
  private readonly logger = new Logger('ChatServiceController');

  constructor(private readonly chatService: ChatServiceService) {}

  @MessagePattern('createOrGetChat')
  async createOrGetChat(
    @Payload() data: { senderId: string; receiverId: string },
  ) {
    this.logger.log(
      `[CHAT] createOrGetChat: sender=${data.senderId}, receiver=${data.receiverId}`,
    );
    return this.chatService.createOrGetChat(data);
  }

  @MessagePattern('createMessage')
  async createMessage(@Payload() data: TChatContent) {
    this.logger.log(
      `[CHAT] createMessage: sender=${data.senderId}, receiver=${data.receiverId}, content="${data.content}"`,
    );
    const result = await this.chatService.createMessage(data);
    this.logger.log(`[CHAT] ✅ createMessage saved with id=${result.id}`);
    return result;
  }

  @MessagePattern('markMessageRead')
  async markAsRead(@Payload() data: { messageId: string; readerId: string }) {
    this.logger.log(
      `[CHAT] markAsRead: messageId=${data.messageId}, reader=${data.readerId}`,
    );
    return this.chatService.markAsRead(data);
  }

  @MessagePattern('getUserByIdForChat')
  async getUserByIdForChat(@Payload() userId: string) {
    this.logger.log(`[CHAT] getUserByIdForChat: userId=${userId}`);
    return this.chatService.getUserByIdForChat(userId);
  }

  @MessagePattern('validateChatUsers')
  async validateChatUsers(
    @Payload() data: { senderId: string; receiverId: string },
  ) {
    this.logger.log(
      `[CHAT] validateChatUsers: sender=${data.senderId}, receiver=${data.receiverId}`,
    );
    const result = await this.chatService.validateChatUsers(
      data.senderId,
      data.receiverId,
    );
    this.logger.log(
      `[CHAT] ✅ validateChatUsers OK: sender=${result.sender?.email}, receiver=${result.receiver?.email}`,
    );
    return result;
  }

  @MessagePattern('getChatHistory')
  async getChatHistory(
    @Payload()
    data: {
      userId1: string;
      userId2: string;
      limit?: number;
      offset?: number;
    },
  ) {
    this.logger.log(
      `[CHAT] getChatHistory: userId1=${data.userId1}, userId2=${data.userId2}`,
    );
    const result = await this.chatService.getChatHistory(
      data.userId1,
      data.userId2,
      data.limit,
      data.offset,
    );
    this.logger.log(`[CHAT] getChatHistory returned ${result} messages`);
    return result;
  }

  @MessagePattern('getUnreadCount')
  async getUnreadCount(@Payload() userId: string) {
    this.logger.log(`[CHAT] getUnreadCount: userId=${userId}`);
    return this.chatService.getUnreadCount(userId);
  }

  @MessagePattern('getRecentChats')
  async getRecentChats(@Payload() userId: string) {
    this.logger.log(`[CHAT] getRecentChats: userId=${userId}`);
    const result = await this.chatService.getRecentChats(userId);
    this.logger.log(`[CHAT] getRecentChats returned ${result.length} chats`);
    return result;
  }

  @MessagePattern('updateReaction')
  async updateReaction(
    @Payload()
    data: {
      messageId: string;
      userId: string;
      emoji: string | null;
    },
  ) {
    this.logger.log(
      `[CHAT] updateReaction: messageId=${data.messageId}, userId=${data.userId}, emoji=${data.emoji}`,
    );
    return this.chatService.updateReaction(data);
  }
}
