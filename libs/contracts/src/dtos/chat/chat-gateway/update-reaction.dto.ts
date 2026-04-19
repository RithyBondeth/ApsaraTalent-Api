import { IsOptional, IsString, IsUUID, ValidateIf } from 'class-validator';
import { MarkAsReadResponseDTO } from './mark-as-read.dto';

/** WebSocket event: react — sent by the client */
export class UpdateReactionDTO {
  @IsUUID()
  messageId: string;

  @IsUUID()
  receiverId: string;

  @ValidateIf((o) => o.emoji !== null)
  @IsOptional()
  @IsString()
  emoji: string | null;
}

export class UpdateReactionRpcDTO {
  @IsUUID()
  messageId: string;

  @IsUUID()
  userId: string;

  @ValidateIf((o) => o.emoji !== null)
  @IsOptional()
  @IsString()
  emoji: string | null;
}

export class UpdateReactionResponseDTO extends MarkAsReadResponseDTO {
  reactions?: Record<string, string>;

  constructor(partial: Partial<UpdateReactionResponseDTO>) {
    super(partial);
  }
}
