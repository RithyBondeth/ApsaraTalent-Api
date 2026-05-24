import { Global, Module } from '@nestjs/common';
import { AiStreamService } from './ai-stream.service';

@Global()
@Module({
  providers: [AiStreamService],
  exports: [AiStreamService],
})
export class AiStreamModule {}
