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
import { CHAT_SERVICE } from 'utils/constants/chat-service.constant';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { v4 as uuidv4 } from 'uuid';

// ── Upload config ────────────────────────────────────────────────────────────
// Files are saved to /uploads/chat/<date>/<uuid><ext> on the server.
// The frontend uses the returned URL to attach the file to a message payload.
//
// Allowed types: images (jpg, png, gif, webp) + documents (pdf, doc, docx, txt).
// Max size: 10 MB.
const ALLOWED_MIME_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
];
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

@Controller('chat')
export class ChatController {
  constructor(@Inject(CHAT_SERVICE.NAME) private chatClient: ClientProxy) {}

  @Post('initiate')
  @UseGuards(AuthGuard)
  async initiateChat(@Body() body: { receiverId: string }, @Req() req) {
    return await firstValueFrom(
      this.chatClient.send('createOrGetChat', {
        senderId: req.user.id,
        receiverId: body.receiverId,
      }),
    );
  }

  @Get('recent')
  @UseGuards(AuthGuard)
  async getRecentChats(@Req() req) {
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

  /**
   * Upload a file or image to attach to a message.
   *
   * Flow:
   *  1. Frontend selects a file and POSTs it here (multipart/form-data).
   *  2. Server validates type + size, saves to disk, returns the public URL.
   *  3. Frontend includes that URL in the socket 'sendMessage' payload as `attachment`.
   *  4. The socket handler stores the URL in the Chat.attachment column.
   *
   * Returns: { url: string, type: 'image' | 'document', filename: string }
   *
   * Security:
   *  - Requires AuthGuard (JWT) — only logged-in users can upload.
   *  - Validates MIME type server-side (not just file extension).
   *  - Stores files with a UUID filename so originals are not guessable.
   *  - Max 10 MB to prevent abuse.
   */
  @Post('upload')
  @UseGuards(AuthGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_FILE_SIZE_BYTES },
      fileFilter: (_req, file, callback) => {
        // Reject disallowed MIME types immediately
        if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
          return callback(
            new BadRequestException(
              `File type not allowed. Allowed: images (jpg/png/gif/webp), PDF, Word, TXT`,
            ),
            false,
          );
        }
        callback(null, true);
      },
      storage: diskStorage({
        destination: (_req, _file, callback) => {
          // Store under /uploads/chat/<YYYY-MM-DD>/ so old files are easy to archive
          const today = new Date().toISOString().slice(0, 10);
          const dir = join(process.cwd(), 'uploads', 'chat', today);
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
    @Req() req,
  ) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Build a public URL path the frontend can use to display the file
    // Format: /uploads/chat/<date>/<uuid>.<ext>
    const today = new Date().toISOString().slice(0, 10);
    const publicUrl = `/uploads/chat/${today}/${file.filename}`;

    // Determine whether this is an image or a document for the frontend to render correctly
    const isImage = file.mimetype.startsWith('image/');
    const type: 'image' | 'document' = isImage ? 'image' : 'document';

    return {
      url: publicUrl,
      type,
      filename: file.originalname,
      size: file.size,
    };
  }
}
