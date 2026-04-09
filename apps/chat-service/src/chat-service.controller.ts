import { TChatContent } from '@app/contracts/interfaces/chat.interface';
import { Controller, Inject } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { PinoLogger } from 'nestjs-pino';

import { IChatController } from '@app/contracts/interfaces/chat.interface';
import { CHAT_SERVICE } from '@app/contracts/constants/chat-service.constant';
import {
  I_CHAT_SERVICE,
  IChatService,
} from '@app/contracts/interfaces/chat-service.interface';

@Controller()
export class ChatController implements IChatController {
  constructor(
    @Inject(I_CHAT_SERVICE) private readonly chatService: IChatService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(ChatController.name);
  }

  @MessagePattern(CHAT_SERVICE.ACTIONS.CREATE_OR_GET_CHAT)
  async initiateChat(
    @Payload() payload: { senderId: string; receiverId: string },
  ) {
    this.logger.info(
      `[CHAT] createOrGetChat: sender=${payload.senderId}, receiver=${payload.receiverId}`,
    );
    return this.chatService.createOrGetChat(payload);
  }

  @MessagePattern(CHAT_SERVICE.ACTIONS.CREATE_MESSAGE)
  async createMessage(@Payload() data: TChatContent) {
    this.logger.info(
      `[CHAT] createMessage: sender=${data.senderId}, receiver=${data.receiverId}, content="${data.content}"`,
    );
    const result = await this.chatService.createMessage(data);
    this.logger.info(`[CHAT] createMessage saved with id=${result.id}`);
    return result;
  }

  @MessagePattern(CHAT_SERVICE.ACTIONS.MARK_MESSAGE_READ)
  async markAsRead(@Payload() data: { messageId: string; readerId: string }) {
    this.logger.info(
      `[CHAT] markAsRead: messageId=${data.messageId}, reader=${data.readerId}`,
    );
    return this.chatService.markAsRead(data);
  }

  @MessagePattern(CHAT_SERVICE.ACTIONS.GET_USER_BY_ID_FOR_CHAT)
  async getUserByIdForChat(@Payload() userId: string) {
    this.logger.info(`[CHAT] getUserByIdForChat: userId=${userId}`);
    return this.chatService.getUserByIdForChat(userId);
  }

  @MessagePattern(CHAT_SERVICE.ACTIONS.VALIDATE_CHAT_USERS)
  async validateChatUsers(
    @Payload() data: { senderId: string; receiverId: string },
  ) {
    this.logger.info(
      `[CHAT] validateChatUsers: sender=${data.senderId}, receiver=${data.receiverId}`,
    );
    const result = await this.chatService.validateChatUsers(
      data.senderId,
      data.receiverId,
    );
    this.logger.info(
      `[CHAT] ✅ validateChatUsers OK: sender=${result.sender?.email}, receiver=${result.receiver?.email}`,
    );
    return result;
  }

  @MessagePattern(CHAT_SERVICE.ACTIONS.GET_CHAT_HISTORY)
  async getChatHistory(
    @Payload()
    data: {
      userId1: string;
      userId2: string;
      limit?: number;
      offset?: number;
    },
  ) {
    this.logger.info(
      `[CHAT] getChatHistory: userId1=${data.userId1}, userId2=${data.userId2}`,
    );
    const result = await this.chatService.getChatHistory(
      data.userId1,
      data.userId2,
      data.limit,
      data.offset,
    );
    this.logger.info('[CHAT] getChatHistory completed');
    return result;
  }

  @MessagePattern(CHAT_SERVICE.ACTIONS.GET_UNREAD_COUNT)
  async getUnreadCount(@Payload() userId: string) {
    this.logger.info(`[CHAT] getUnreadCount: userId=${userId}`);
    return this.chatService.getUnreadCount(userId);
  }

  @MessagePattern(CHAT_SERVICE.ACTIONS.GET_RECENT_CHATS)
  async getRecentChats(@Payload() userId: string) {
    this.logger.info(`[CHAT] getRecentChats: userId=${userId}`);
    const result = await this.chatService.getRecentChats(userId);
    this.logger.info(`[CHAT] getRecentChats returned ${result.length} chats`);
    return result;
  }

  @MessagePattern(CHAT_SERVICE.ACTIONS.UPDATE_REACTION)
  async updateReaction(
    @Payload()
    data: {
      messageId: string;
      userId: string;
      emoji: string | null;
    },
  ) {
    this.logger.info(
      `[CHAT] updateReaction: messageId=${data.messageId}, userId=${data.userId}, emoji=${data.emoji}`,
    );
    return this.chatService.updateReaction(data);
  }

  /**
   * Soft-delete a message.
   * Only the original sender can delete; the row stays in the DB
   * with isDeleted=true so reply references and read receipts are preserved.
   */
  /**
   * Edit a message's content.
   * Only the original sender may edit; deleted messages cannot be edited.
   * Sets isEdited=true so the UI shows "(edited)" label.
   */
  @MessagePattern(CHAT_SERVICE.ACTIONS.EDIT_MESSAGE)
  async editMessage(
    @Payload()
    data: {
      messageId: string;
      requesterId: string;
      newContent: string;
    },
  ) {
    this.logger.info(
      `[CHAT] editMessage: messageId=${data.messageId}, requester=${data.requesterId}`,
    );
    return this.chatService.editMessage(data);
  }

  /**
   * Soft-delete a message.
   * Only the original sender can delete; the row stays in the DB
   * with isDeleted=true so reply references and read receipts are preserved.
   */
  @MessagePattern(CHAT_SERVICE.ACTIONS.DELETE_MESSAGE)
  async deleteMessage(
    @Payload() data: { messageId: string; requesterId: string },
  ) {
    this.logger.info(
      `[CHAT] deleteMessage: messageId=${data.messageId}, requester=${data.requesterId}`,
    );
    return this.chatService.deleteMessage(data);
  }
}
