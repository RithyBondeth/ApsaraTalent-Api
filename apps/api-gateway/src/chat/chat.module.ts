import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { CHAT_SERVICE } from 'utils/constants/chat-service.constant';
import { ConfigService } from '@nestjs/config';
import { USER_SERVICE } from 'utils/constants/user-service.constant';
import { ChatController } from './chat.controller';

@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: USER_SERVICE.NAME,
        useFactory: (config: ConfigService) => ({
          transport: Transport.TCP,
          options: {
            host: config.get('services.user.host'),
            port: config.get('services.user.port'),
          },
        }),
        inject: [ConfigService],
      },
      {
        name: CHAT_SERVICE.NAME,
        useFactory: (configService: ConfigService) => ({
          transport: Transport.TCP,
          options: {
            host: configService.get<string>('services.chat.host'),
            port: configService.get<number>('services.chat.port'),
          },
        }),
        inject: [ConfigService],
      },
    ]),
  ],
  controllers: [ChatController]
})
export class ChatModule {}
