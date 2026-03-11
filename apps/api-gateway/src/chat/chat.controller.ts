import { Body, Controller, Inject, Post } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { CHAT_SERVICE } from 'utils/constants/chat-service.constant';

@Controller('chat')
export class ChatController {
  constructor(@Inject(CHAT_SERVICE.NAME) private chatClient: ClientProxy) {}

  @Post('initiate')
  async initiateChat(@Body() body: { senderId: string; receiverId: string }) {
    return await firstValueFrom(this.chatClient.send('createOrGetChat', body));
  }
}
