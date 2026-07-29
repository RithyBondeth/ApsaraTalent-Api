import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { CHAT_SERVICE } from '@app/contracts/constants/service-actions/chat-service.constant';
import { SendMessageDTO, SendMessageResultDTO } from '@app/contracts';
import { IChatMessageService } from '@app/contracts/interfaces/service';
import { rpcCall } from '../../utils/rpc-call';

@Injectable()
export class ChatMessageService implements IChatMessageService {
  constructor(
    @Inject(CHAT_SERVICE.NAME) private readonly chatServiceClient: ClientProxy,
  ) {}

  async sendMessage(
    senderId: string,
    sendMessageDTO: SendMessageDTO,
  ): Promise<SendMessageResultDTO> {
    const trimmedContent = sendMessageDTO.content?.trim() ?? '';
    const hasAttachment = !!sendMessageDTO.attachment;
    const messageType = sendMessageDTO.type ?? 'text';

    const usersData = await rpcCall<any>(
      this.chatServiceClient,
      CHAT_SERVICE.ACTIONS.VALIDATE_CHAT_USERS,
      {
        senderId,
        receiverId: sendMessageDTO.receiverId,
      },
    );

    const savedMessage = await rpcCall<any>(
      this.chatServiceClient,
      CHAT_SERVICE.ACTIONS.CREATE_MESSAGE,
      {
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
      },
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
