import { AuthGuard } from '@app/common/guards/auth.guard';
import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Inject,
  Logger,
  NotFoundException,
  Param,
  Post,
  Req,
  UploadedFile,
  Res,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ClientProxy } from '@nestjs/microservices';
import { CHAT_SERVICE } from '@app/contracts/constants/service-actions/chat-service.constant';
import { chatUploadMulterOptions } from '../config/chat-upload.config';
import { IChatController } from '@app/contracts/interfaces/controller/chat-controller.interface';
import {
  InitiateChatResponseDTO,
  UploadAttachmentResponseDTO,
  InitiateChatDTO,
} from '@app/contracts/dtos/chat';
import { rpcCall } from '../../utils/rpc-call';
import { Response } from 'express';
import { access } from 'fs/promises';
import { basename, resolve, sep } from 'path';

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
    const protectedUrl = `/chat/attachment/${today}/${file.filename}`;

    const isImage = file.mimetype.startsWith('image/');
    const isAudio = file.mimetype.startsWith('audio/');
    const type: 'image' | 'document' | 'audio' = isImage
      ? 'image'
      : isAudio
        ? 'audio'
        : 'document';

    return new UploadAttachmentResponseDTO({
      url: protectedUrl,
      type,
      filename: file.originalname,
      size: file.size,
    });
  }

  @Get('attachment/:date/:filename')
  @UseGuards(AuthGuard)
  async getAttachment(
    @Param('date') date: string,
    @Param('filename') filename: string,
    @Req() req: any,
    @Res() res: Response,
  ): Promise<void> {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || filename !== basename(filename)) {
      throw new NotFoundException('Attachment not found');
    }

    const attachment = `/chat/attachment/${date}/${filename}`;
    let canAccess = await rpcCall<boolean>(
      this.chatClient,
      CHAT_SERVICE.ACTIONS.CAN_ACCESS_ATTACHMENT,
      { userId: req.user.id, attachment },
    );
    if (!canAccess) {
      canAccess = await rpcCall<boolean>(
        this.chatClient,
        CHAT_SERVICE.ACTIONS.CAN_ACCESS_ATTACHMENT,
        {
          userId: req.user.id,
          attachment: `/storage/chat/${date}/${filename}`,
        },
      );
    }
    if (!canAccess) throw new ForbiddenException('Attachment access denied');

    const chatRoot = resolve(process.cwd(), 'storage', 'chat');
    const filePath = resolve(chatRoot, date, filename);
    if (!filePath.startsWith(`${chatRoot}${sep}`)) {
      throw new NotFoundException('Attachment not found');
    }

    try {
      await access(filePath);
    } catch {
      throw new NotFoundException('Attachment not found');
    }

    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.sendFile(filePath);
  }
}
