import { BadRequestException } from '@nestjs/common';
import { extname } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { createUploadStorageEngine } from '@app/common';
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
  // Date-partitioned so the attachment URL keeps its /chat/<date>/<file> shape,
  // which the authenticated download endpoint and the stored message rows both
  // depend on. The engine resolves local-vs-S3 per request.
  storage: createUploadStorageEngine({
    resolveFolder: () => `chat/${new Date().toISOString().slice(0, 10)}`,
    resolveFilename: (_req, file) => `${uuidv4()}${extname(file.originalname)}`,
  }),
};
