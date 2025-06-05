import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { CHAT_SERVICE } from 'utils/constants/chat-service.constant';
import { ConfigService } from '@nestjs/config';
import { USER_SERVICE } from 'utils/constants/user-service.constant';

@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: USER_SERVICE.NAME,
        useFactory: (config: ConfigService) => ({
          transport: Transport.TCP,
          options: {
            host: config.get('USER_SERVICE_HOST'),
            port: config.get('USER_SERVICE_PORT'),
          },
        }),
        inject: [ConfigService],
      },
      {
        name: CHAT_SERVICE.NAME,
        useFactory: (configService: ConfigService) => ({
          transport: Transport.TCP,
          options: {
            host: configService.get<string>('CHAT_SERVICE_HOST'),
            port: configService.get<number>('CHAT_SERVICE_PORT'),
          },
        }),
        inject: [ConfigService],
      },
    ]),
  ],
})
export class ChatModule {}
