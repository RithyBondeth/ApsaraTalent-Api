import { Module } from '@nestjs/common';
import { MessageService } from './message.service';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from '../logger/logger.module';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: './libs/.env',
    }),
    LoggerModule,
  ],
  providers: [MessageService],
  exports: [MessageService],
})
export class MessageModule {}
