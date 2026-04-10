import { AuthGuard } from '@app/common/guards/auth.guard';
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Inject,
  Logger,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { CHAT_SERVICE } from '@app/contracts/constants/service-actions/chat-service.constant';
import { chatUploadMulterOptions } from './config/chat-upload.config';
import { IChatController } from '@app/contracts/interfaces/domain/chat.interface';

@Controller('chat')
export class ChatController implements IChatController {
  private readonly logger = new Logger(ChatController.name);

  constructor(@Inject(CHAT_SERVICE.NAME) private chatClient: ClientProxy) {}

  @Post('initiate')
  @UseGuards(AuthGuard)
  async initiateChat(
    @Body() body: { receiverId: string },
    @Req() req: any,
  ): Promise<any> {
    return await firstValueFrom(
      this.chatClient.send(CHAT_SERVICE.ACTIONS.CREATE_OR_GET_CHAT, {
        senderId: req.user.id,
        receiverId: body.receiverId,
      }),
    );
  }

  @Get('recent')
  @UseGuards(AuthGuard)
  async getRecentChats(@Req() req: any): Promise<any> {
    try {
      const userId = req.user.id;
      return await firstValueFrom(
        this.chatClient.send(CHAT_SERVICE.ACTIONS.GET_RECENT_CHATS, userId),
      );
    } catch (error: any) {
      this.logger.error(
        `Failed to getRecentChats: ${error?.message || 'Unknown'}`,
      );
      throw error;
    }
  }

  @Post('upload')
  @UseGuards(AuthGuard)
  @UseInterceptors(FileInterceptor('file', chatUploadMulterOptions))
  async uploadAttachment(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: any,
  ): Promise<any> {
    if (!file) throw new BadRequestException('No file provided');

    const today = new Date().toISOString().slice(0, 10);
    const publicUrl = `/storage/chat/${today}/${file.filename}`;

    const isImage = file.mimetype.startsWith('image/');
    const isAudio = file.mimetype.startsWith('audio/');
    const type: 'image' | 'document' | 'audio' = isImage
      ? 'image'
      : isAudio
        ? 'audio'
        : 'document';

    return {
      url: publicUrl,
      type,
      filename: file.originalname,
      size: file.size,
    };
  }
}
