import { BadRequestException, mixin, Type } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { UploadfileService } from './uploadfile.service';

export function UploadFilesInterceptor(
  fieldName: string,
  folderName: string,
  maxCount = 10,
  allowedMimeTypes?: string[],
  maxFileSizeBytes?: number,
): Type<any> {
  class MixinUploadFilesInterceptor extends FilesInterceptor(
    fieldName,
    maxCount,
    {
      storage: UploadfileService.storageOptions(folderName),
      limits: maxFileSizeBytes ? { fileSize: maxFileSizeBytes } : undefined,
      fileFilter: allowedMimeTypes
        ? (_req: any, file: any, callback: any) => {
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
    },
  ) {}
  return mixin(MixinUploadFilesInterceptor);
}
