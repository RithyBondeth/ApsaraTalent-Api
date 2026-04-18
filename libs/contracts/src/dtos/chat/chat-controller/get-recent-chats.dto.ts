import { InitiateChatResponseDTO } from './initate-chat.dto';

export class GetRecentChatsResponseDTO extends InitiateChatResponseDTO {
    constructor(partial: Partial<GetRecentChatsResponseDTO>) {
        super(partial);
            Object.assign(this, partial);
    }
}
