import { SendMessageResponseDTO } from './send-message.dto';

export class GetChatHistoryResponseDTO {
  messages: SendMessageResponseDTO[];
  partnerId: string;
  partnerProfile: any;

  constructor(partial: Partial<GetChatHistoryResponseDTO>) {
    Object.assign(this, partial);
  }
}
