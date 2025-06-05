import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { CHAT_SERVICE } from 'utils/constants/chat-service.constant';
import { ConfigService } from '@nestjs/config';

@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: CHAT_SERVICE.NAME,
        useFactory: (configService: ConfigService) => ({
          transport: Transport.TCP,
          options: {
            host: configService.get<string>('CHAT_SERVICE_PORT'),
            port: configService.get<number>('CHAT_SERVICE_PORT'),
          },
        }),
        inject: [ConfigService],
      },
    ]),
  ],
})
export class ChatModule {}
