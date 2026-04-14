import { IsString, IsUUID, MaxLength } from 'class-validator';
import { MarkAsReadResponseDTO } from './mark-as-read.dto';

/** WebSocket event: editMessage — sent by the client */
export class EditMessageDTO {
  @IsUUID()
  messageId: string;

  @IsUUID()
  receiverId: string;

  @IsString()
  @MaxLength(5000)
  newContent: string;
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
}

export class EditMessageResponseDTO extends MarkAsReadResponseDTO {}
