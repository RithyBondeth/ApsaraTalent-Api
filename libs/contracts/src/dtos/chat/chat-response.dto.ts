import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
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

export class ChatMessageResponseDTO {
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

  constructor(partial: Partial<ChatMessageResponseDTO>) {
    Object.assign(this, partial);
  }
}

export class ChatInitResponseDTO {
  @IsUUID()
  id: string;

  @IsUUID()
  chatId: string;

  @IsString()
  name: string;

  @IsString()
  avatar: string;

  @IsString()
  email: string;

  @IsBoolean()
  isRead: boolean;

  @IsString()
  preview: string;

  @IsString()
  time: string;

  @IsBoolean()
  alreadyExists: boolean;

  constructor(partial: Partial<ChatInitResponseDTO>) {
    Object.assign(this, partial);
  }
}

export class ChatHistoryResponseDTO {
  messages: ChatMessageResponseDTO[];
  partnerId: string;
  partnerProfile: any;

  constructor(partial: Partial<ChatHistoryResponseDTO>) {
    Object.assign(this, partial);
  }
}

export class ChatActionResponseDTO {
  @IsBoolean()
  success: boolean;

  @IsOptional()
  @IsUUID()
  messageId?: string;

  @IsOptional()
  @IsString()
  newContent?: string;

  @IsOptional()
  @IsUUID()
  senderId?: string;

  @IsOptional()
  @IsString()
  receiverId?: string | null;

  @IsOptional()
  reactions?: Record<string, string>;

  constructor(partial: Partial<ChatActionResponseDTO>) {
    Object.assign(this, partial);
  }
}

export class ChatUploadResponseDTO {
  @IsString()
  url: string;

  @IsString()
  type: 'image' | 'document' | 'audio';

  @IsString()
  filename: string;

  @IsNumber()
  size: number;

  constructor(partial: Partial<ChatUploadResponseDTO>) {
    Object.assign(this, partial);
  }
}

export class ChatUnreadCountResponseDTO {
  @IsNumber()
  count: number;

  constructor(partial: Partial<ChatUnreadCountResponseDTO>) {
    Object.assign(this, partial);
  }
}
