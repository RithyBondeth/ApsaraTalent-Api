import { Module } from '@nestjs/common';
import { StorageModule } from '../storage/storage.module';
import { UploadfileService } from './uploadfile.service';

@Module({
  imports: [StorageModule],
  providers: [UploadfileService],
  exports: [UploadfileService, StorageModule],
})
export class UploadfileModule {}
