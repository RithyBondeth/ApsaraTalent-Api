import {
  IsBoolean,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class ChatParticipantDTO {
  @IsUUID()
  id: string;

  @IsString()
  name: string;

  @IsString()
  email: string;

  constructor(partial: Partial<ChatParticipantDTO>) {
    Object.assign(this, partial);
  }
}

export class SendMessageResponseDTO {
  @IsUUID()
  id: string;

  @IsUUID()
  senderId: string;

  @IsUUID()
  receiverId: string;

  @IsString()
  content: string;

  @IsString()
  messageType: string;

  @IsBoolean()
  isRead: boolean;

  reactions: Record<string, string>;

  sentAt: Date;

  @IsOptional()
  @IsBoolean()
  isDeleted?: boolean;

  @IsOptional()
  @IsBoolean()
  isEdited?: boolean;

  @IsOptional()
  @IsString()
  replyToId?: string | null;

  @IsOptional()
  @IsString()
  attachment?: string | null;

  @IsOptional()
  @IsString()
  attachmentType?: string | null;

  @IsOptional()
  @IsString()
  attachmentFilename?: string | null;

  @IsOptional()
  @IsNumber()
  attachmentDuration?: number | null;

  @IsOptional()
  attachmentAmplitude?: number[] | null;

  @IsOptional()
  sender?: ChatParticipantDTO;

  @IsOptional()
  receiver?: ChatParticipantDTO;

  constructor(partial: Partial<SendMessageResponseDTO>) {
    Object.assign(this, partial);
  }
}

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

  constructor(partial: Partial<SendMessageDTO>) {
    Object.assign(this, partial);
  }
}
