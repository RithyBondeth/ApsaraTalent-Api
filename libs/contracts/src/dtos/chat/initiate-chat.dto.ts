import { IsUUID } from 'class-validator';

/** POST /chat/initiate — initiates or retrieves an existing chat */
export class InitiateChatDTO {
  @IsUUID()
  receiverId: string;

  constructor(partial: Partial<InitiateChatDTO>) {
    Object.assign(this, partial);
  }
}

/** Sent to chat-service: createOrGetChat */
export class CreateOrGetChatDTO {
  @IsUUID()
  senderId: string;

  @IsUUID()
  receiverId: string;

  constructor(partial: Partial<CreateOrGetChatDTO>) {
    Object.assign(this, partial);
  }
}
