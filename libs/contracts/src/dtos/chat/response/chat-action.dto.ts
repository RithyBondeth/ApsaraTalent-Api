/** Standard response for chat-related actions (e.g., mark as read, delete, edit) */
export class ChatActionResponseDTO {
  success: boolean;
  messageId?: string;
  newContent?: string;
  senderId?: string;
  receiverId?: string | null;
  reactions?: Record<string, string>;

  constructor(partial: Partial<ChatActionResponseDTO>) {
    Object.assign(this, partial);
  }
}
