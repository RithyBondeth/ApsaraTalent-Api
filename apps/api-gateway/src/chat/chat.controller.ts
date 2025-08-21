import { Controller, Post, Body } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { Inject } from '@nestjs/common';
import { CHAT_SERVICE } from 'utils/constants/chat-service.constant';
import { firstValueFrom } from 'rxjs';

@Controller('chat')
export class ChatController {
  constructor(
    @Inject(CHAT_SERVICE.NAME) private chatClient: ClientProxy,
  ) {}

  @Post('initiate')
  async initiateChat(
    @Body() body: { senderId: string; receiverId: string },
  ) {
    return await firstValueFrom(
      this.chatClient.send('createOrGetChat', body),
    );
  }
}