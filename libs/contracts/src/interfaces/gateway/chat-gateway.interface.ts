import { Socket } from 'socket.io';
import {
  GetChatHistoryDTO,
  GetChatHistoryResponseDTO,
  GetRecentChatsResponseDTO,
  SendMessageDTO,
  SendMessageResponseDTO,
} from '@app/contracts/dtos/chat';
import { GetUnreadCountResponseDTO } from '@app/contracts/dtos/chat/chat-gateway/get-unread-count.dto';
import {
  MarkAsReadDTO,
  MarkAsReadResponseDTO,
} from '@app/contracts/dtos/chat/chat-gateway/mark-as-read.dto';
import { TypingDTO } from '@app/contracts/dtos/chat/chat-gateway/typing.dto';
import {
  UpdateReactionDTO,
  UpdateReactionResponseDTO,
} from '@app/contracts/dtos/chat/chat-gateway/update-reaction.dto';
import {
  EditMessageDTO,
  EditMessageResponseDTO,
} from '@app/contracts/dtos/chat/chat-gateway/edit-message.dto';
import {
  DeleteMessageDTO,
  DeleteMessageResponseDTO,
} from '@app/contracts/dtos/chat/chat-gateway/delete-message.dto';

export interface IChatGateway {
  handleConnection(client: Socket): Promise<void>;
  handleDisconnect(client: Socket): Promise<void>;
  handleGetOnlineUsers(userIds: string[]): Record<string, boolean>;
  handleMessage(
    client: Socket,
    sendMessageDTO: SendMessageDTO,
  ): Promise<SendMessageResponseDTO | void>;
  handleGetRecentChats(client: Socket): Promise<GetRecentChatsResponseDTO[]>;
  handleGetChatHistory(
    client: Socket,
    getChatHistoryDTO: GetChatHistoryDTO,
  ): Promise<GetChatHistoryResponseDTO>;
  handleGetUnreadCount(client: Socket): Promise<GetUnreadCountResponseDTO>;
  handleRead(
    client: Socket,
    markAsReadDTO: MarkAsReadDTO,
  ): Promise<MarkAsReadResponseDTO | void>;
  handleTyping(client: Socket, typingDTO: TypingDTO): Promise<void>;
  handleReaction(
    client: Socket,
    updateReactionDTO: UpdateReactionDTO,
  ): Promise<UpdateReactionResponseDTO | void>;
  handleEditMessage(
    client: Socket,
    editMessageDTO: EditMessageDTO,
  ): Promise<EditMessageResponseDTO | void>;
  handleDeleteMessage(
    client: Socket,
    deleteMessageDTO: DeleteMessageDTO,
  ): Promise<DeleteMessageResponseDTO | void>;
}
