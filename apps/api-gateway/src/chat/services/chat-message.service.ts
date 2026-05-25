import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { CHAT_SERVICE } from '@app/contracts/constants/service-actions/chat-service.constant';
import { SendMessageDTO } from '@app/contracts';
import {
  IChatMessageService,
  SendMessageResult,
} from '@app/contracts/interfaces/service';

@Injectable()
export class ChatMessageService implements IChatMessageService {
  constructor(
    @Inject(CHAT_SERVICE.NAME) private readonly chatServiceClient: ClientProxy,
  ) {}

  async sendMessage(
    senderId: string,
    sendMessageDTO: SendMessageDTO,
  ): Promise<SendMessageResult> {
    const trimmedContent = sendMessageDTO.content?.trim() ?? '';
    const hasAttachment = !!sendMessageDTO.attachment;
    const messageType = sendMessageDTO.type ?? 'text';

    const usersData = await firstValueFrom(
      this.chatServiceClient.send(CHAT_SERVICE.ACTIONS.VALIDATE_CHAT_USERS, {
        senderId,
        receiverId: sendMessageDTO.receiverId,
      }),
    );

    const savedMessage = await firstValueFrom(
      this.chatServiceClient.send(CHAT_SERVICE.ACTIONS.CREATE_MESSAGE, {
        senderId: usersData.sender.id,
        receiverId: usersData.receiver.id,
        content: trimmedContent,
        type: messageType,
        timestamp: new Date(),
        replyToId: sendMessageDTO.replyToId ?? null,
        attachment: sendMessageDTO.attachment ?? null,
        attachmentFilename: sendMessageDTO.attachmentFilename ?? null,
        attachmentDuration: sendMessageDTO.attachmentDuration ?? null,
        attachmentAmplitude: sendMessageDTO.attachmentAmplitude ?? null,
      }),
    );

    return {
      usersData,
      savedMessage,
      trimmedContent,
      messageType,
      hasAttachment,
    };
  }
}
