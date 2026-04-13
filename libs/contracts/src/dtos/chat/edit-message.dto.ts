import { IsString, IsUUID, MaxLength } from 'class-validator';

/** WebSocket event: editMessage — sent by the client */
export class EditMessageDTO {
  @IsUUID()
  messageId: string;

  @IsUUID()
  receiverId: string;

  @IsString()
  @MaxLength(5000)
  newContent: string;

  constructor(partial: Partial<EditMessageDTO>) {
    Object.assign(this, partial);
  }
}

/** Sent to chat-service: editMessage (RPC payload) */
export class EditMessageRpcDTO {
  @IsUUID()
  messageId: string;

  @IsUUID()
  requesterId: string;

  @IsString()
  @MaxLength(5000)
  newContent: string;

  constructor(partial: Partial<EditMessageRpcDTO>) {
    Object.assign(this, partial);
  }
}
