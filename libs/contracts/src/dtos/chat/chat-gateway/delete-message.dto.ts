import { IsUUID } from 'class-validator';
import { MarkAsReadResponseDTO } from './mark-as-read.dto';

/** WebSocket event: deleteMessage — sent by the client */
export class DeleteMessageDTO {
  @IsUUID()
  messageId: string;

  @IsUUID()
  receiverId: string;
}

/** Sent to chat-service: deleteMessage (RPC payload) */
export class DeleteMessageRpcDTO {
  @IsUUID()
  messageId: string;

  @IsUUID()
  requesterId: string;
}

export class DeleteMessageResponseDTO extends MarkAsReadResponseDTO {}
