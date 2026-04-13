export class ChatParticipantDTO {
  id: string;
  name: string;
  email: string;

  constructor(partial: Partial<ChatParticipantDTO>) {
    Object.assign(this, partial);
  }
}

export class SendMessageResponseDTO {
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

  constructor(partial: Partial<SendMessageResponseDTO>) {
    Object.assign(this, partial);
  }
}

export class SendMessageAckResponseDTO {
  status: string;
  message: SendMessageResponseDTO;

  constructor(partial: Partial<SendMessageAckResponseDTO>) {
    Object.assign(this, partial);
  }
}
