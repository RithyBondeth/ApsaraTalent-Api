import { IsNumber, IsOptional, IsUUID } from 'class-validator';
import { MessageResponseDTO } from './send-message.dto';
import { UserResponseDTO } from '../../user';

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
}

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
}

export class GetChatHistoryResponseDTO {
  messages: MessageResponseDTO[];
  partnerId: string;
  partnerProfile: UserResponseDTO;

  constructor(partial: Partial<GetChatHistoryResponseDTO>) {
    Object.assign(this, partial);
  }
}
