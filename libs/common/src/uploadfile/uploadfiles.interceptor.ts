import { FilesInterceptor } from '@nestjs/platform-express';
import { UploadfileService } from './uploadfile.service';
import { mixin, Type } from '@nestjs/common'; // <-- important!

export function UploadFilesInterceptor(
  fieldName: string,
  folderName: string,
  maxCount = 10,
): Type<any> {
  class MixinUploadFilesInterceptor extends FilesInterceptor(
    fieldName,
    maxCount,
    {
      storage: UploadfileService.storageOptions(folderName),
    },
  ) {}
  return mixin(MixinUploadFilesInterceptor);
}
