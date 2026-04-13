import { IsUUID } from 'class-validator';

/** Sent to chat-service: validateChatUsers (RPC payload) */
export class ValidateChatUsersDTO {
  @IsUUID()
  senderId: string;

  @IsUUID()
  receiverId: string;

  constructor(partial: Partial<ValidateChatUsersDTO>) {
    Object.assign(this, partial);
  }
}
