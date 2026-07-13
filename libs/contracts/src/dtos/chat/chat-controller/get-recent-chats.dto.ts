import { InitiateChatResponseDTO } from './initiate-chat.dto';

export class GetRecentChatsResponseDTO extends InitiateChatResponseDTO {
  constructor(partial: Partial<GetRecentChatsResponseDTO>) {
    super(partial);
  }
}
