import { JwtModule } from '@app/common';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { CHAT_SERVICE } from '@app/contracts/constants/service-actions/chat-service.constant';
import { NOTIFICATION_SERVICE } from '@app/contracts/constants/service-actions/notification-service.constant';
import { USER_SERVICE } from '@app/contracts/constants/service-actions/user-service.constant';
import { ChatController } from './controllers/chat.controller';
import { ChatGateway } from './gateways/chat.gateway';
import { CallGateway } from './gateways/call.gateway';
import { SocketStateService } from './services/socket-state.service';
import { ChatNotificationService } from './services/chat-notification.service';
import { ChatRateLimiterService } from './services/chat-rate-limiter.service';

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
      {
        name: NOTIFICATION_SERVICE.NAME,
        useFactory: (configService: ConfigService) => ({
          transport: Transport.TCP,
          options: {
            host: configService.get<string>('services.notification.host'),
            port: configService.get<number>('services.notification.port'),
          },
        }),
        inject: [ConfigService],
      },
    ]),
    JwtModule,
  ],
  controllers: [ChatController],
  providers: [
    ChatGateway,
    CallGateway,
    SocketStateService,
    ChatRateLimiterService,
    ChatNotificationService,
  ],
})
export class ChatModule {}
