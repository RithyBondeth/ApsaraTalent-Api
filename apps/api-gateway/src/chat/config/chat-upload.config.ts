import { BadRequestException } from '@nestjs/common';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { v4 as uuidv4 } from 'uuid';
import {
  ALLOWED_MIME_TYPES_FOR_CHAT,
  MAX_FILE_SIZE_BYTES_FOR_CHAT,
} from '@app/contracts/constants/domain/chat.constant';
import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';

export const chatUploadMulterOptions: MulterOptions = {
  limits: { fileSize: MAX_FILE_SIZE_BYTES_FOR_CHAT },
  fileFilter: (_req: any, file: any, callback: any) => {
    const mime = (file.mimetype || '').split(';')[0].trim();
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
    destination: (_req: any, _file: any, callback: any) => {
      const today = new Date().toISOString().slice(0, 10);
      const dir = join(process.cwd(), 'storage', 'chat', today);
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
      callback(null, dir);
    },
    filename: (_req: any, file: any, callback: any) => {
      callback(null, `${uuidv4()}${extname(file.originalname)}`);
    },
  }),
};
