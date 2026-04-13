export class ChatParticipantDTO {
  id: string;
  name: string;
  email: string;
}

export class ChatMessageResponseDTO {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  messageType: string;
  isRead: boolean;
  reactions: Record<string, string>;
  sentAt: Date;
  isDeleted?: boolean;
  isEdited?: boolean;
  replyToId?: string | null;
  attachment?: string | null;
  attachmentType?: string | null;
  attachmentFilename?: string | null;
  attachmentDuration?: number | null;
  attachmentAmplitude?: number[] | null;
  sender?: ChatParticipantDTO;
  receiver?: ChatParticipantDTO;
}

export class ChatInitResponseDTO {
  id: string;
  chatId: string;
  name: string;
  avatar: string;
  email: string;
  isRead: boolean;
  preview: string;
  time: string;
  alreadyExists: boolean;
}

export class ChatHistoryResponseDTO {
  messages: ChatMessageResponseDTO[];
  partnerId: string;
  partnerProfile: any;
}

export class ChatActionResponseDTO {
  success: boolean;
  messageId?: string;
  newContent?: string;
  senderId?: string;
  receiverId?: string | null;
  reactions?: Record<string, string>;
}

export class ChatUploadResponseDTO {
  url: string;
  type: 'image' | 'document' | 'audio';
  filename: string;
  size: number;
}
