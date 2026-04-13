import { IsOptional, IsString, IsUUID } from 'class-validator';

/** WebSocket event: react — sent by the client */
export class UpdateReactionDTO {
  @IsUUID()
  messageId: string;

  @IsUUID()
  receiverId: string;

  @IsOptional()
  @IsString()
  emoji: string | null;

  constructor(partial: Partial<UpdateReactionDTO>) {
    Object.assign(this, partial);
  }
}

/** Sent to chat-service: updateReaction (RPC payload) */
export class UpdateReactionRpcDTO {
  @IsUUID()
  messageId: string;

  @IsUUID()
  userId: string;

  @IsOptional()
  @IsString()
  emoji: string | null;

  constructor(partial: Partial<UpdateReactionRpcDTO>) {
    Object.assign(this, partial);
  }
}
