import { IsOptional, IsUUID } from 'class-validator';

/** WebSocket event: markAsRead — sent by the client */
export class MarkAsReadDTO {
  @IsUUID()
  messageId: string;

  @IsOptional()
  @IsUUID()
  senderId?: string;

  constructor(partial: Partial<MarkAsReadDTO>) {
    Object.assign(this, partial);
  }
}

/** Sent to chat-service: markMessageRead (RPC payload) */
export class MarkMessageReadDTO {
  @IsUUID()
  messageId: string;

  @IsUUID()
  readerId: string;

  constructor(partial: Partial<MarkMessageReadDTO>) {
    Object.assign(this, partial);
  }
}
