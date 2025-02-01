import { Module } from '@nestjs/common';
import { UploadfileService } from './uploadfile.service';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({ 
      isGlobal: true,
      envFilePath: './libs/.env',
    }),
  ],
  providers: [UploadfileService]
})
export class UploadfileModule {}
