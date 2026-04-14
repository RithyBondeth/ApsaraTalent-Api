import { IsUUID } from 'class-validator';
import { UserResponseDTO } from '../../user';

/** Sent to chat-service: validateChatUsers (RPC payload) */
export class ValidateChatUsersDTO {
  @IsUUID()
  senderId: string;

  @IsUUID()
  receiverId: string;
}

export class ValidateChatUsersResponseDTO {
  sender: UserResponseDTO;
  receiver: UserResponseDTO;

  constructor(partial: Partial<ValidateChatUsersResponseDTO>) {
    Object.assign(this, partial);
  }
}
