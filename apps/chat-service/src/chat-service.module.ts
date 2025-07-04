import { Module } from '@nestjs/common';
import { ChatServiceService } from './chat-service.service';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule, LoggerModule } from '@app/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '@app/common/database/entities/user.entity';
import { Chat } from '@app/common/database/entities/chat.entity';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { USER_SERVICE } from 'utils/constants/user-service.constant';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: './apps/chat-service/.env',
    }),
    LoggerModule,
    DatabaseModule,
    TypeOrmModule.forFeature([ User, Chat ]),
    ClientsModule.register([
      {
        name: USER_SERVICE.NAME,
        transport: Transport.TCP,
        options: {
          host: process.env.USER_SERVICE_HOST,
          port: parseInt(process.env.USER_SERVICE_PORT),
        },
      },
    ]),
  ],
  controllers: [],
  providers: [ChatServiceService],
})
export class ChatServiceModule {}
