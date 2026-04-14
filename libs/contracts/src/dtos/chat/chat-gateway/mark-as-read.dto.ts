import { IsOptional, IsUUID } from 'class-validator';
import { CallAnswerResponseDTO } from '../call-gateway';

/** WebSocket event: markAsRead — sent by the client */
export class MarkAsReadDTO {
  @IsUUID()
  messageId: string;

  @IsOptional()
  @IsUUID()
  senderId?: string;
}

export class MarkAsReadRpcDTO {
  @IsUUID()
  messageId: string;

  @IsUUID()
  readerId: string;
}

/** Standard response for chat-related actions (e.g., mark as read, delete, edit) */
export class MarkAsReadResponseDTO {
  success: boolean;
  messageId?: string;
  newContent?: string;
  senderId?: string;
  receiverId?: string | null;
  reactions?: Record<string, string>;

  constructor(partial: Partial<MarkAsReadResponseDTO>) {
    Object.assign(this, partial);
  }
}
