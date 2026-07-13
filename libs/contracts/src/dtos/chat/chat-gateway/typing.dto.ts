import { IsBoolean, IsUUID } from 'class-validator';

/** WebSocket event: typing — sent by the client */
export class TypingDTO {
  @IsUUID()
  receiverId: string;

  @IsBoolean()
  isTyping: boolean;
}
