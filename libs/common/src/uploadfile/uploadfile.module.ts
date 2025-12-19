import { Module } from '@nestjs/common';
import { UploadfileService } from './uploadfile.service';

@Module({
  providers: [UploadfileService],
  exports: [UploadfileService],
})
export class UploadfileModule {}
