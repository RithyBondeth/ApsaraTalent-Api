import { IChatMessage, TChatContent } from '../domain/chat.interface';
import {
  ChatActionResponseDTO,
  GetChatHistoryResponseDTO,
  GetUnreadCountResponseDTO,
  InitiateChatResponseDTO,
  SendMessageResponseDTO,
  SendMessageDTO,
} from '../../dtos/chat';

export const I_CHAT_SERVICE = 'IChatService';

export interface IChatService {
  createOrGetChat(
    senderId: string,
    receiverId: string,
  ): Promise<InitiateChatResponseDTO>;
  createMessage(
    payload: SendMessageDTO & { senderId: string },
  ): Promise<SendMessageResponseDTO>;
  editMessage(
    messageId: string,
    requesterId: string,
    newContent: string,
  ): Promise<ChatActionResponseDTO>;
  updateReaction(
    messageId: string,
    userId: string,
    emoji: string | null,
  ): Promise<ChatActionResponseDTO>;
  deleteMessage(
    messageId: string,
    requesterId: string,
  ): Promise<ChatActionResponseDTO>;
  markMessageRead(messageId: string, readerId: string): Promise<number>;
  getUserByIdForChat(userId: string): Promise<any>;
  validateChatUsers(senderId: string, receiverId: string): Promise<any>;
  getChatHistory(
    userId1: string,
    userId2: string,
    limit?: number,
    offset?: number,
  ): Promise<GetChatHistoryResponseDTO>;
  getUnreadCount(u: string): Promise<number>;
  getRecentChats(u: string): Promise<any[]>;
}
