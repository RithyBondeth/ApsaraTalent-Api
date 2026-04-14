import { IsUUID } from 'class-validator';

/** POST /chat/initiate — initiates or retrieves an existing chat */
export class InitiateChatDTO {
  @IsUUID()
  receiverId: string;
}

export class InitiateChatResponseDTO {
  id: string;
  chatId: string;
  name: string;
  avatar: string;
  email: string;
  isRead: boolean;
  preview: string;
  time: string;
  alreadyExists: boolean;

  constructor(partial: Partial<InitiateChatResponseDTO>) {
    Object.assign(this, partial);
  }
}
