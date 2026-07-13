import {
  BadRequestException,
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadfileService } from './uploadfile.service';

@Injectable()
export class UploadFileInterceptor implements NestInterceptor {
  constructor(
    private readonly fileName: string,
    private readonly folderName: string,
    private readonly allowedMimeTypes?: string[],
    private readonly maxFileSizeBytes?: number,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler) {
    const { allowedMimeTypes, maxFileSizeBytes } = this;
    const fileInterceptor = FileInterceptor(this.fileName, {
      storage: UploadfileService.storageOptions(this.folderName),
      limits: maxFileSizeBytes ? { fileSize: maxFileSizeBytes } : undefined,
      fileFilter: allowedMimeTypes
        ? (_req, file, callback) => {
            const mime = (file.mimetype || '').split(';')[0].trim();
            if (!allowedMimeTypes.includes(mime)) {
              return callback(
                new BadRequestException(
                  `File type "${mime}" is not allowed. Allowed types: ${allowedMimeTypes.join(', ')}`,
                ),
                false,
              );
            }
            callback(null, true);
          }
        : undefined,
    });
    const fileInterceptorInstance = new (fileInterceptor as any)();
    return fileInterceptorInstance.intercept(context, next);
  }
}
