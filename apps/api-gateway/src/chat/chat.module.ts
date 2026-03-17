import { DatabaseModule, JwtModule } from '@app/common';
import { User } from '@app/common/database/entities/user.entity';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CHAT_SERVICE } from 'utils/constants/chat-service.constant';
import { USER_SERVICE } from 'utils/constants/user-service.constant';
import { ChatController } from './chat.controller';
import { ChatGateway } from './chat.gateway';

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
    DatabaseModule,
    JwtModule,
    TypeOrmModule.forFeature([User]),
  ],
  controllers: [ChatController],
  providers: [ChatGateway], // ← was missing — gateway never started without this
})
export class ChatModule {}
