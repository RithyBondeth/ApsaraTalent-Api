export interface TChatPayload {
  receiverId: string;
  content: string;
  type?: 'text' | 'image' | 'file';
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
  sendAt: Date;
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
