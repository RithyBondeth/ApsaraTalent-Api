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

  constructor(partial: Partial<SendMessageDTO>) {
    Object.assign(this, partial);
  }
}
