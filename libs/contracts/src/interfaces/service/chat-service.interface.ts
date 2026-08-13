import {
  CreateMessageDTO,
  CreateMessageResponseDTO,
  CreateOrGetChatDTO,
  GetChatHistoryResponseDTO,
  GetChatHistoryRpcDTO,
  GetRecentChatsResponseDTO,
  InitiateChatResponseDTO,
  ValidateChatUsersDTO,
  ValidateChatUsersResponseDTO,
} from '../../dtos/chat';
import { UserResponseDTO } from '../../dtos/user';
import {
  EditMessageResponseDTO,
  EditMessageRpcDTO,
} from '@app/contracts/dtos/chat/chat-gateway/edit-message.dto';
import {
  UpdateReactionResponseDTO,
  UpdateReactionRpcDTO,
} from '@app/contracts/dtos/chat/chat-gateway/update-reaction.dto';
import {
  DeleteMessageResponseDTO,
  DeleteMessageRpcDTO,
} from '@app/contracts/dtos/chat/chat-gateway/delete-message.dto';
import {
  MarkAsReadResponseDTO,
  MarkAsReadRpcDTO,
} from '@app/contracts/dtos/chat/chat-gateway/mark-as-read.dto';

export const I_CHAT_SERVICE = 'IChatService';
export const I_CHAT_QUERY_SERVICE = 'IChatQueryService';

export interface IChatService {
  createOrGetChat(
    createOrGetChatDTO: CreateOrGetChatDTO,
  ): Promise<InitiateChatResponseDTO>;
  createMessage(
    createMessageDTO: CreateMessageDTO,
  ): Promise<CreateMessageResponseDTO>;
  editMessage(
    editMessageDTO: EditMessageRpcDTO,
  ): Promise<EditMessageResponseDTO>;
  updateReaction(
    updateReactionDTO: UpdateReactionRpcDTO,
  ): Promise<UpdateReactionResponseDTO>;
  deleteMessage(
    deleteMessageDTO: DeleteMessageRpcDTO,
  ): Promise<DeleteMessageResponseDTO>;
  markAsRead(markAsReadDTO: MarkAsReadRpcDTO): Promise<MarkAsReadResponseDTO>;
}

/** Read side of chat: history, listings, counts and access checks. */
export interface IChatQueryService {
  getUserByIdForChat(userId: string): Promise<UserResponseDTO>;
  validateChatUsers(
    validateChatUsersDTO: ValidateChatUsersDTO,
  ): Promise<ValidateChatUsersResponseDTO>;
  getChatHistory(
    getChatHistoryDTO: GetChatHistoryRpcDTO,
  ): Promise<GetChatHistoryResponseDTO>;
  getUnreadCount(u: string): Promise<number>;
  getRecentChats(u: string): Promise<GetRecentChatsResponseDTO[]>;
  canAccessAttachment(userId: string, attachment: string): Promise<boolean>;
}
