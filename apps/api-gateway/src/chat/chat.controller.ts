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
import { CHAT_SERVICE } from '@app/contracts/constants/service-actions/chat-service.constant';
import { chatUploadMulterOptions } from './config/chat-upload.config';
import { IChatController } from '@app/contracts/interfaces/domain/chat.interface';
import {
  InitiateChatResponseDTO,
  UploadAttachmentResponseDTO,
  InitiateChatDTO,
} from '@app/contracts/dtos/chat';
import { rpcCall } from '../utils/rpc-call';

@Controller('chat')
export class ChatController implements IChatController {
  private readonly logger = new Logger(ChatController.name);

  constructor(@Inject(CHAT_SERVICE.NAME) private chatClient: ClientProxy) {}

  @Post('initiate')
  @UseGuards(AuthGuard)
  async initiateChat(
    @Body() initiateChatDTO: InitiateChatDTO,
    @Req() req: any,
  ): Promise<InitiateChatResponseDTO> {
    return rpcCall<InitiateChatResponseDTO>(
      this.chatClient,
      CHAT_SERVICE.ACTIONS.CREATE_OR_GET_CHAT,
      {
        senderId: req.user.id,
        receiverId: initiateChatDTO.receiverId,
      },
    );
  }

  @Get('recent')
  @UseGuards(AuthGuard)
  async getRecentChats(@Req() req: any): Promise<InitiateChatResponseDTO[]> {
    try {
      return await rpcCall<InitiateChatResponseDTO[]>(
        this.chatClient,
        CHAT_SERVICE.ACTIONS.GET_RECENT_CHATS,
        req.user.id,
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
  ): Promise<UploadAttachmentResponseDTO> {
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

    return new UploadAttachmentResponseDTO({
      url: publicUrl,
      type,
      filename: file.originalname,
      size: file.size,
    });
  }
}
