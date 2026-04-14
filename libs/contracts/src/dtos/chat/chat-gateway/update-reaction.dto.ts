import { IsOptional, IsString, IsUUID } from 'class-validator';
import { MarkAsReadResponseDTO } from './mark-as-read.dto';

/** WebSocket event: react — sent by the client */
export class UpdateReactionDTO {
  @IsUUID()
  messageId: string;

  @IsUUID()
  receiverId: string;

  @IsOptional()
  @IsString()
  emoji: string | null;
}

export class UpdateReactionRpcDTO {
  @IsUUID()
  messageId: string;

  @IsUUID()
  userId: string;

  @IsOptional()
  @IsString()
  emoji: string | null;
}

export class UpdateReactionResponseDTO extends MarkAsReadResponseDTO {}
