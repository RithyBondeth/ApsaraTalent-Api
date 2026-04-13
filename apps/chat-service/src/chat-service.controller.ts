import { Controller, Inject } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { PinoLogger } from 'nestjs-pino';
import { CHAT_SERVICE } from '@app/contracts/constants/service-actions/chat-service.constant';
import {
  ChatActionResponseDTO,
  GetChatHistoryResponseDTO,
  GetUnreadCountResponseDTO,
  InitiateChatResponseDTO,
  SendMessageResponseDTO,
  SendMessageDTO,
  CreateOrGetChatDTO,
  MarkMessageReadDTO,
  EditMessageRpcDTO,
  DeleteMessageRpcDTO,
  GetChatHistoryRpcDTO,
  UpdateReactionRpcDTO,
} from '@app/contracts/dtos/chat';
import {
  I_CHAT_SERVICE,
  IChatService,
} from '@app/contracts/interfaces/service/chat-service.interface';

@Controller()
export class ChatController {
  constructor(
    @Inject(I_CHAT_SERVICE) private readonly chatService: IChatService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(ChatController.name);
  }

  @MessagePattern(CHAT_SERVICE.ACTIONS.CREATE_OR_GET_CHAT)
  async createOrGetChat(
    @Payload() data: CreateOrGetChatDTO,
  ): Promise<InitiateChatResponseDTO> {
    return this.chatService.createOrGetChat(data.senderId, data.receiverId);
  }

  @MessagePattern(CHAT_SERVICE.ACTIONS.CREATE_MESSAGE)
  async createMessage(
    @Payload() data: SendMessageDTO & { senderId: string },
  ): Promise<SendMessageResponseDTO> {
    return this.chatService.createMessage(data);
  }

  @MessagePattern(CHAT_SERVICE.ACTIONS.MARK_MESSAGE_READ)
  async markAsRead(@Payload() data: MarkMessageReadDTO): Promise<number> {
    this.logger.info(
      `[CHAT] markAsRead: messageId=${data.messageId}, reader=${data.readerId}`,
    );
    return this.chatService.markMessageRead(data.messageId, data.readerId);
  }

  @MessagePattern(CHAT_SERVICE.ACTIONS.GET_USER_BY_ID_FOR_CHAT)
  async getUserByIdForChat(@Payload() userId: string): Promise<any> {
    this.logger.info(`[CHAT] getUserByIdForChat: userId=${userId}`);
    return this.chatService.getUserByIdForChat(userId);
  }

  @MessagePattern(CHAT_SERVICE.ACTIONS.VALIDATE_CHAT_USERS)
  async validateChatUsers(
    @Payload() data: { senderId: string; receiverId: string },
  ): Promise<{ sender: any; receiver: any }> {
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
    @Payload() data: GetChatHistoryRpcDTO,
  ): Promise<GetChatHistoryResponseDTO> {
    return this.chatService.getChatHistory(
      data.userId1,
      data.userId2,
      data.limit,
      data.offset,
    );
  }

  @MessagePattern(CHAT_SERVICE.ACTIONS.GET_UNREAD_COUNT)
  async getUnreadCount(
    @Payload() data: { userId: string },
  ): Promise<GetUnreadCountResponseDTO> {
    const count = await this.chatService.getUnreadCount(data.userId);
    return new GetUnreadCountResponseDTO({ count });
  }

  @MessagePattern(CHAT_SERVICE.ACTIONS.GET_RECENT_CHATS)
  async getRecentChats(
    @Payload() userId: string,
  ): Promise<InitiateChatResponseDTO[]> {
    this.logger.info(`[CHAT] getRecentChats: userId=${userId}`);
    const result = await this.chatService.getRecentChats(userId);
    this.logger.info(`[CHAT] getRecentChats returned ${result.length} chats`);
    return result;
  }

  @MessagePattern(CHAT_SERVICE.ACTIONS.UPDATE_REACTION)
  async updateReaction(
    @Payload() data: UpdateReactionRpcDTO,
  ): Promise<ChatActionResponseDTO> {
    return this.chatService.updateReaction(
      data.messageId,
      data.userId,
      data.emoji,
    );
  }

  /**
   * Edit a message's content.
   * Only the original sender may edit; deleted messages cannot be edited.
   * Sets isEdited=true so the UI shows "(edited)" label.
   */
  @MessagePattern(CHAT_SERVICE.ACTIONS.EDIT_MESSAGE)
  async editMessage(
    @Payload() data: EditMessageRpcDTO,
  ): Promise<ChatActionResponseDTO> {
    return this.chatService.editMessage(
      data.messageId,
      data.requesterId,
      data.newContent,
    );
  }

  /**
   * Soft-delete a message.
   * Only the original sender can delete; the row stays in the DB
   * with isDeleted=true so reply references and read receipts are preserved.
   */
  @MessagePattern(CHAT_SERVICE.ACTIONS.DELETE_MESSAGE)
  async deleteMessage(
    @Payload() data: DeleteMessageRpcDTO,
  ): Promise<ChatActionResponseDTO> {
    return this.chatService.deleteMessage(data.messageId, data.requesterId);
  }
}
