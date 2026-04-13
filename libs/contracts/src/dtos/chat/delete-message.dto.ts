import { IsUUID } from 'class-validator';

/** WebSocket event: deleteMessage — sent by the client */
export class DeleteMessageDTO {
  @IsUUID()
  messageId: string;

  @IsUUID()
  receiverId: string;

  constructor(partial: Partial<DeleteMessageDTO>) {
    Object.assign(this, partial);
  }
}

/** Sent to chat-service: deleteMessage (RPC payload) */
export class DeleteMessageRpcDTO {
  @IsUUID()
  messageId: string;

  @IsUUID()
  requesterId: string;

  constructor(partial: Partial<DeleteMessageRpcDTO>) {
    Object.assign(this, partial);
  }
}
