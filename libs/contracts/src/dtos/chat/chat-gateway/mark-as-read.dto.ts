import { IsOptional, IsUUID } from 'class-validator';

/** WebSocket event: markAsRead — sent by the client */
export class MarkAsReadDTO {
  @IsUUID()
  messageId: string;

  /**
   * ID of the message's original sender — used only for WebSocket notification routing.
   * Not required for the read operation itself (reader is taken from auth context).
   */
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

/** Base response for simple chat operations (mark as read). */
export class MarkAsReadResponseDTO {
  success: boolean;
  messageId?: string;

  constructor(partial: Partial<MarkAsReadResponseDTO>) {
    Object.assign(this, partial);
  }
}
