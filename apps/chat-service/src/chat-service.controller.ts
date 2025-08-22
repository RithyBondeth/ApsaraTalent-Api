import { Controller } from '@nestjs/common';
import { ChatServiceService } from './chat-service.service';
import { EventPattern, MessagePattern, Payload } from '@nestjs/microservices';
import { TChatContent } from '@app/common/interfaces/chat.interface';

@Controller()
export class ChatServiceController {
  constructor(private readonly chatService: ChatServiceService) {}

  @MessagePattern('createOrGetChat')
  async createOrGetChat(
    @Payload() data: { senderId: string; receiverId: string },
  ) {
    console.log("Inside Chat Service");
    return this.chatService.createOrGetChat(data.senderId, data.receiverId);
  }

  @EventPattern('createMessage')
  async createMessage(@Payload() data: TChatContent) {
    return this.chatService.createMessage(data);
  }

  @EventPattern('markMessageRead')
  async markAsRead(@Payload() data: { messageId: string; readerId: string }) {
    return this.chatService.markAsRead(data);
  }

  @MessagePattern('getUserByIdForChat')
  async getUserByIdForChat(@Payload() userId: string) {
    return this.chatService.getUserByIdForChat(userId);
  }

  @MessagePattern('validateChatUsers')
  async validateChatUsers(
    @Payload() data: { senderId: string; receiverId: string },
  ) {
    return this.chatService.validateChatUsers(data.senderId, data.receiverId);
  }

  @MessagePattern()
  async getChatHistory(
    @Payload()
    data: {
      userId1: string;
      userId2: string;
      limit?: number;
      offset?: number;
    },
  ) {
    return this.chatService.getChatHistory(
      data.userId1,
      data.userId2,
      data.limit,
      data.offset,
    );
  }

  @MessagePattern('getUnreadCount')
  async getUnreadCount(@Payload() userId: string) {
    return this.chatService.getUnreadCount(userId);
  }

  @MessagePattern('getRecentChats')
  async getRecentChats(@Payload() userId: string) {
    return this.chatService.getRecentChats(userId);
  }
}
