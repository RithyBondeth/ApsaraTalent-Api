import { AuthGuard } from '@app/common/guards/auth.guard';
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Inject,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { CHAT_SERVICE } from '@app/contracts/constants/chat-service.constant';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { IChatController } from '@app/contracts/interfaces/chat.interface';
import {
  ALLOWED_MIME_TYPES_FOR_CHAT,
  MAX_FILE_SIZE_BYTES_FOR_CHAT,
} from '@app/contracts/constants/chat.constant';

@Controller('chat')
export class ChatController implements IChatController {
  constructor(@Inject(CHAT_SERVICE.NAME) private chatClient: ClientProxy) {}

  @Post('initiate')
  @UseGuards(AuthGuard)
  async initiateChat(
    @Body() body: { receiverId: string },
    @Req() req: any,
  ): Promise<any> {
    return await firstValueFrom(
      this.chatClient.send('createOrGetChat', {
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
        this.chatClient.send('getRecentChats', userId),
      );
    } catch (error) {
      console.error('Failed to getRecentChats:', error);
      throw error;
    }
  }

  @Post('upload')
  @UseGuards(AuthGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_FILE_SIZE_BYTES_FOR_CHAT },
      fileFilter: (_req, file, callback) => {
        const mime = (file.mimetype || '').split(';')[0].trim();
        // Reject disallowed MIME types immediately
        if (!ALLOWED_MIME_TYPES_FOR_CHAT.includes(mime)) {
          return callback(
            new BadRequestException(
              `File type not allowed. Allowed: images (jpg/png/gif/webp), audio (webm/ogg/mp4/mpeg/wav), PDF, Word, TXT`,
            ),
            false,
          );
        }
        callback(null, true);
      },
      storage: diskStorage({
        destination: (_req, _file, callback) => {
          // Store under storage/chat/<YYYY-MM-DD>/ so old files are easy to archive
          const today = new Date().toISOString().slice(0, 10);
          const dir = join(process.cwd(), 'storage', 'chat', today);
          // Create the directory tree if it doesn't exist yet
          if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
          callback(null, dir);
        },
        filename: (_req, file, callback) => {
          // UUID filename prevents guessability; keep original extension for MIME detection
          callback(null, `${uuidv4()}${extname(file.originalname)}`);
        },
      }),
    }),
  )
  async uploadAttachment(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: any,
  ): Promise<any> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Build a public URL path the frontend can use to display the file
    // Format: /storage/chat/<date>/<uuid>.<ext>
    const today = new Date().toISOString().slice(0, 10);
    const publicUrl = `/storage/chat/${today}/${file.filename}`;

    // Determine whether this is an image, audio, or document for the frontend to render correctly
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
