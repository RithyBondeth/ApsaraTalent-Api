import { Module } from '@nestjs/common';
import { LoggerModule } from '../logger/logger.module';
import { MessageService } from './message.service';

@Module({
  imports: [LoggerModule],
  providers: [MessageService],
  exports: [MessageService],
})
export class MessageModule {}
