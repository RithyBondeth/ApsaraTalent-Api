import { IChatMessage, TChatContent } from '../domain/chat.interface';
import {
  ChatActionResponseDTO,
  GetChatHistoryResponseDTO,
  InitiateChatResponseDTO,
} from '../../dtos/chat';

export const I_CHAT_SERVICE = 'IChatService';

export interface IChatService {
  createOrGetChat(data: {
    senderId: string;
    receiverId: string;
  }): Promise<InitiateChatResponseDTO>;
  createMessage(payload: TChatContent): Promise<IChatMessage>;
  editMessage(data: {
    messageId: string;
    requesterId: string;
    newContent: string;
  }): Promise<ChatActionResponseDTO>;
  updateReaction(data: {
    messageId: string;
    userId: string;
    emoji: string | null;
  }): Promise<ChatActionResponseDTO>;
  deleteMessage(data: {
    messageId: string;
    requesterId: string;
  }): Promise<ChatActionResponseDTO>;
  markAsRead(data: {
    messageId: string;
    readerId: string;
  }): Promise<{ success: boolean }>;
  getUserByIdForChat(userId: string): Promise<any>;
  validateChatUsers(
    senderId: string,
    receiverId: string,
  ): Promise<{ sender: any; receiver: any }>;
  getChatHistory(
    userId1: string,
    userId2: string,
    limit?: number,
    offset?: number,
  ): Promise<GetChatHistoryResponseDTO>;
  getUnreadCount(u: string): Promise<number>;
  getRecentChats(u: string): Promise<any[]>;
}
