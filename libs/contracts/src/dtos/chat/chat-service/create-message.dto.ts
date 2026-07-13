import { MessageResponseDTO, SendMessageDTO } from '../chat-gateway';
import { IsUUID } from 'class-validator';

export class CreateMessageDTO extends SendMessageDTO {
  @IsUUID()
  senderId: string;
}
export class CreateMessageResponseDTO extends MessageResponseDTO {
  constructor(partial: Partial<CreateMessageResponseDTO>) {
    super(partial);
  }
}
