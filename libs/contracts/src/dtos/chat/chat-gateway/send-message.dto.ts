import {
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

/** WebSocket event: sendMessage — sent by the client */
export class SendMessageDTO {
  @IsUUID()
  receiverId: string;

  @IsString()
  @MaxLength(5000)
  content: string;

  @IsOptional()
  @IsIn(['text', 'image', 'document', 'audio', 'call'])
  type?: 'text' | 'image' | 'document' | 'audio' | 'call';

  @IsOptional()
  @IsUUID()
  replyToId?: string | null;

  @IsOptional()
  @IsString()
  attachment?: string | null;

  @IsOptional()
  @IsString()
  attachmentFilename?: string | null;

  @IsOptional()
  @IsNumber()
  attachmentDuration?: number | null;

  @IsOptional()
  attachmentAmplitude?: number[] | null;
}

export class ChatParticipantDTO {
  id: string;
  name: string;
  email: string;

  constructor(partial: Partial<ChatParticipantDTO>) {
    Object.assign(this, partial);
  }
}

export class MessageResponseDTO {
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

  constructor(partial: Partial<MessageResponseDTO>) {
    Object.assign(this, partial);
  }
}

export class SendMessageResponseDTO {
  status: string;
  message: MessageResponseDTO;

  constructor(partial: Partial<SendMessageResponseDTO>) {
    Object.assign(this, partial);
  }
}
