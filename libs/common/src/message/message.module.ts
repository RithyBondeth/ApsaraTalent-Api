import { Module } from '@nestjs/common';
import { MessageService } from './message.service';
import { LoggerModule } from '../logger/logger.module';

@Module({
  imports: [ LoggerModule ],
  providers: [MessageService],
  exports: [MessageService],
})
export class MessageModule {}
