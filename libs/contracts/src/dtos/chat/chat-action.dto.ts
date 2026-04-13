import { IsBoolean, IsOptional, IsString, IsUUID } from 'class-validator';

/** Standard response for chat-related actions (e.g., mark as read, delete, edit) */
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
