import { Module } from '@nestjs/common';
import { ChatServiceService } from './chat-service.service';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule, LoggerModule } from '@app/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '@app/common/database/entities/user.entity';
import { Chat } from '@app/common/database/entities/chat.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: './apps/chat-service/.env',
    }),
    LoggerModule,
    DatabaseModule,
    TypeOrmModule.forFeature([ User, Chat ])
  ],
  controllers: [],
  providers: [ChatServiceService],
})
export class ChatServiceModule {}
