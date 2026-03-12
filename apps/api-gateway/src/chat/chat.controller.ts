import { AuthGuard } from '@app/common/guards/auth.guard';
import {
  Body,
  Controller,
  Get,
  Inject,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
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

  @Get('recent')
  @UseGuards(AuthGuard)
  async getRecentChats(@Req() req) {
    try {
      const userId = req.user.id; // User decorator/payload from AuthGuard
      return await firstValueFrom(
        this.chatClient.send('getRecentChats', userId),
      );
    } catch (error) {
      console.error('Failed to getRecentChats:', error);
      throw error;
    }
  }
}
