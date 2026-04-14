import { Controller, Inject } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { PinoLogger } from 'nestjs-pino';
import { CHAT_SERVICE } from '@app/contracts/constants/service-actions/chat-service.constant';
import { UserResponseDTO } from '@app/contracts/dtos/user';
import {
  I_CHAT_SERVICE,
  IChatService,
} from '@app/contracts/interfaces/service/chat-service.interface';
import {
  CreateOrGetChatDTO,
  GetRecentChatsResponseDTO,
  InitiateChatResponseDTO,
  ValidateChatUsersDTO,
  ValidateChatUsersResponseDTO,
} from '@app/contracts';
import {
  CreateMessageDTO,
  CreateMessageResponseDTO,
} from '@app/contracts/dtos/chat/chat-service/create-message.dto';
import {
  GetChatHistoryRpcDTO,
  GetChatHistoryResponseDTO,
} from '@app/contracts/dtos/chat/chat-gateway/get-chat-history.dto';
import {
  UpdateReactionRpcDTO,
  UpdateReactionResponseDTO,
} from '@app/contracts/dtos/chat/chat-gateway/update-reaction.dto';
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
    return this.chatService.createOrGetChat(data);
  }

  @MessagePattern(CHAT_SERVICE.ACTIONS.CREATE_MESSAGE)
  async createMessage(
    @Payload() data: CreateMessageDTO,
  ): Promise<CreateMessageResponseDTO> {
    return this.chatService.createMessage(data);
  }

  @MessagePattern(CHAT_SERVICE.ACTIONS.MARK_MESSAGE_READ)
  async markAsRead(
    @Payload() data: MarkAsReadRpcDTO,
  ): Promise<MarkAsReadResponseDTO> {
    this.logger.info(
      `[CHAT] markAsRead: messageId=${data.messageId}, reader=${data.readerId}`,
    );
    return this.chatService.markAsRead(data);
  }

  @MessagePattern(CHAT_SERVICE.ACTIONS.GET_USER_BY_ID_FOR_CHAT)
  async getUserByIdForChat(
    @Payload() userId: string,
  ): Promise<UserResponseDTO> {
    this.logger.info(`[CHAT] getUserByIdForChat: userId=${userId}`);
    return this.chatService.getUserByIdForChat(userId);
  }

  @MessagePattern(CHAT_SERVICE.ACTIONS.VALIDATE_CHAT_USERS)
  async validateChatUsers(
    @Payload() data: ValidateChatUsersDTO,
  ): Promise<ValidateChatUsersResponseDTO> {
    this.logger.info(
      `[CHAT] validateChatUsers: sender=${data.senderId}, receiver=${data.receiverId}`,
    );
    const result = await this.chatService.validateChatUsers(data);
    this.logger.info(
      `[CHAT] ✅ validateChatUsers OK: sender=${result.sender?.email}, receiver=${result.receiver?.email}`,
    );
    return result;
  }

  @MessagePattern(CHAT_SERVICE.ACTIONS.GET_CHAT_HISTORY)
  async getChatHistory(
    @Payload() data: GetChatHistoryRpcDTO,
  ): Promise<GetChatHistoryResponseDTO> {
    return this.chatService.getChatHistory(data);
  }

  @MessagePattern(CHAT_SERVICE.ACTIONS.GET_UNREAD_COUNT)
  async getUnreadCount(@Payload() userId: string): Promise<number> {
    const count = await this.chatService.getUnreadCount(userId);
    return count;
  }

  @MessagePattern(CHAT_SERVICE.ACTIONS.GET_RECENT_CHATS)
  async getRecentChats(
    @Payload() userId: string,
  ): Promise<GetRecentChatsResponseDTO[]> {
    this.logger.info(`[CHAT] getRecentChats: userId=${userId}`);
    const result = await this.chatService.getRecentChats(userId);
    this.logger.info(`[CHAT] getRecentChats returned ${result.length} chats`);
    return result;
  }

  @MessagePattern(CHAT_SERVICE.ACTIONS.UPDATE_REACTION)
  async updateReaction(
    @Payload() data: UpdateReactionRpcDTO,
  ): Promise<UpdateReactionResponseDTO> {
    return this.chatService.updateReaction(data);
  }

  /**
   * Edit a message's content.
   * Only the original sender may edit; deleted messages cannot be edited.
   * Sets isEdited=true so the UI shows "(edited)" label.
   */
  @MessagePattern(CHAT_SERVICE.ACTIONS.EDIT_MESSAGE)
  async editMessage(
    @Payload() data: EditMessageRpcDTO,
  ): Promise<EditMessageResponseDTO> {
    return this.chatService.editMessage(data);
  }

  /**
   * Soft-delete a message.
   * Only the original sender can delete; the row stays in the DB
   * with isDeleted=true so reply references and read receipts are preserved.
   */
  @MessagePattern(CHAT_SERVICE.ACTIONS.DELETE_MESSAGE)
  async deleteMessage(
    @Payload() data: DeleteMessageRpcDTO,
  ): Promise<DeleteMessageResponseDTO> {
    return this.chatService.deleteMessage(data);
  }
}
