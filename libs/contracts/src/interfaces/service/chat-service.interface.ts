import {
  CreateMessageDTO,
  CreateMessageResponseDTO,
  CreateOrGetChatDTO,
  GetChatHistoryRpcDTO,
  GetRecentChatsResponseDTO,
  InitiateChatResponseDTO,
  ValidateChatUsersDTO,
  ValidateChatUsersResponseDTO,
} from '../../dtos/chat';
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

export interface IChatService {
  createOrGetChat(data: CreateOrGetChatDTO): Promise<InitiateChatResponseDTO>;
  createMessage(payload: CreateMessageDTO): Promise<CreateMessageResponseDTO>;
  editMessage(data: EditMessageRpcDTO): Promise<EditMessageResponseDTO>;
  updateReaction(
    data: UpdateReactionRpcDTO,
  ): Promise<UpdateReactionResponseDTO>;
  deleteMessage(data: DeleteMessageRpcDTO): Promise<DeleteMessageResponseDTO>;
  markAsRead(data: MarkAsReadRpcDTO): Promise<MarkAsReadResponseDTO>;
  getUserByIdForChat(userId: string): Promise<any>;
  validateChatUsers(
    data: ValidateChatUsersDTO,
  ): Promise<ValidateChatUsersResponseDTO>;
  getChatHistory(data: GetChatHistoryRpcDTO): Promise<any>;
  getUnreadCount(u: string): Promise<number>;
  getRecentChats(u: string): Promise<GetRecentChatsResponseDTO[]>;
}
