import { IsUUID } from 'class-validator';
import { InitiateChatResponseDTO } from '../chat-controller';

/** Sent to chat-service: createOrGetChat */
export class CreateOrGetChatDTO {
  @IsUUID()
  senderId: string;

  @IsUUID()
  receiverId: string;
}

export class CreateOrGetChatResponseDTO extends InitiateChatResponseDTO {}
