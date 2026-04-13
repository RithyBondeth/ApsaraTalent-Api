import { IsNumber, IsOptional, IsUUID } from 'class-validator';
import { SendMessageResponseDTO } from './chat-message.dto';

/** WebSocket event: getChatHistory — fetched by the client */
export class GetChatHistoryDTO {
  @IsUUID()
  userId2: string;

  @IsOptional()
  @IsNumber()
  limit?: number;

  @IsOptional()
  @IsNumber()
  offset?: number;

  constructor(partial: Partial<GetChatHistoryDTO>) {
    Object.assign(this, partial);
  }
}

/** Sent to chat-service: getChatHistory (RPC payload) */
export class GetChatHistoryRpcDTO {
  @IsUUID()
  userId1: string;

  @IsUUID()
  userId2: string;

  @IsOptional()
  @IsNumber()
  limit?: number;

  @IsOptional()
  @IsNumber()
  offset?: number;

  constructor(partial: Partial<GetChatHistoryRpcDTO>) {
    Object.assign(this, partial);
  }
}

export class GetChatHistoryResponseDTO {
  messages: SendMessageResponseDTO[];
  partnerId: string;
  partnerProfile: any;

  constructor(partial: Partial<GetChatHistoryResponseDTO>) {
    Object.assign(this, partial);
  }
}
