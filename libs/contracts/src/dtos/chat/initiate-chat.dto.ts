import { IsBoolean, IsString, IsUUID } from 'class-validator';

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

export class InitiateChatResponseDTO {
  @IsUUID()
  id: string;

  @IsUUID()
  chatId: string;

  @IsString()
  name: string;

  @IsString()
  avatar: string;

  @IsString()
  email: string;

  @IsBoolean()
  isRead: boolean;

  @IsString()
  preview: string;

  @IsString()
  time: string;

  @IsBoolean()
  alreadyExists: boolean;

  constructor(partial: Partial<InitiateChatResponseDTO>) {
    Object.assign(this, partial);
  }
}
