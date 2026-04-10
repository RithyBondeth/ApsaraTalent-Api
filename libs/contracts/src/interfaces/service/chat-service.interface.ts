import { IChatMessage, TChatContent } from '../domain/chat.interface';

export const I_CHAT_SERVICE = 'IChatService';

export interface IChatService {
  createOrGetChat(data: { senderId: string; receiverId: string }): Promise<any>;
  createMessage(data: TChatContent): Promise<IChatMessage>;
  editMessage(data: {
    messageId: string;
    requesterId: string;
    newContent: string;
  }): Promise<any>;
  deleteMessage(data: { messageId: string; requesterId: string }): Promise<any>;
  markAsRead(data: { messageId: string; readerId: string }): Promise<any>;
  getUserByIdForChat(userId: string): Promise<any>;
  validateChatUsers(senderId: string, receiverId: string): Promise<any>;
  getChatHistory(
    u1: string,
    u2: string,
    limit?: number,
    offset?: number,
  ): Promise<any>;
  getUnreadCount(u: string): Promise<number>;
  updateReaction(data: {
    messageId: string;
    userId: string;
    emoji: string | null;
  }): Promise<any>;
  getRecentChats(u: string): Promise<any>;
}
