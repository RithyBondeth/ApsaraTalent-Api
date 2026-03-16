export interface TChatPayload {
  receiverId: string;
  content: string;
  type?: 'text' | 'image' | 'document';
  /** UUID of the message being replied to (optional) */
  replyToId?: string | null;
  /** URL of an uploaded file/image attachment (optional) */
  attachment?: string | null;
}

export interface TChatContent extends TChatPayload {
  senderId: string;
  timestamp?: Date;
}

export interface IChatMessage {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  messageType: string;
  isRead: boolean;
  reactions: {};
  sentAt: Date;
  /** True when sender deleted the message (soft-delete tombstone) */
  isDeleted?: boolean;
  /**
   * True when the sender has edited the message after sending.
   * Shown as a small "(edited)" label in the bubble.
   */
  isEdited?: boolean;
  /** UUID of the message being quoted/replied to, or null for top-level messages */
  replyToId?: string | null;
  /** URL of an uploaded file or image attachment */
  attachment?: string | null;
  sender?: {
    id: string;
    name: string;
    email: string;
  };
  receiver?: {
    id: string;
    name: string;
    email: string;
  };
}
