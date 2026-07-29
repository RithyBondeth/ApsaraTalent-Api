import { Module } from '@nestjs/common';
import { LoggerModule } from '../logger/logger.module';
import { EmailModule } from '../email/email.module';
import { MessageService } from './message.service';

@Module({
  imports: [LoggerModule, EmailModule],
  providers: [MessageService],
  exports: [MessageService],
})
export class MessageModule {}
