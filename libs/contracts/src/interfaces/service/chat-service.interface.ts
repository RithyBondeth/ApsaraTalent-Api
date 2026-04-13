import { IChatMessage, TChatContent } from '../domain/chat.interface';
import {
  ChatActionResponseDTO,
  ChatHistoryResponseDTO,
  ChatInitResponseDTO,
  ChatMessageResponseDTO,
} from '@app/contracts/dtos/chat';

export const I_CHAT_SERVICE = 'IChatService';

export interface IChatService {
  createOrGetChat(data: { senderId: string; receiverId: string }): Promise<ChatInitResponseDTO>;
  createMessage(data: TChatContent): Promise<ChatMessageResponseDTO>;
  editMessage(data: { messageId: string; requesterId: string; newContent: string }): Promise<ChatActionResponseDTO>;
  deleteMessage(data: { messageId: string; requesterId: string }): Promise<ChatActionResponseDTO>;
  markAsRead(data: { messageId: string; readerId: string }): Promise<ChatActionResponseDTO>;
  getUserByIdForChat(userId: string): Promise<any>;
  validateChatUsers(senderId: string, receiverId: string): Promise<any>;
  getChatHistory(u1: string, u2: string, limit?: number, offset?: number): Promise<ChatHistoryResponseDTO>;
  getUnreadCount(u: string): Promise<number>;
  updateReaction(data: { messageId: string; userId: string; emoji: string | null }): Promise<ChatActionResponseDTO>;
  getRecentChats(u: string): Promise<any[]>;
}
