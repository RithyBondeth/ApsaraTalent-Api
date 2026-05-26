import {
  DatabaseModule,
  JwtModule,
  LoggerModule,
  RedisCacheHealthIndicator,
} from '@app/common';
import { RedisModule } from '@app/common/redis/redis.module';
import { ConfigModule } from '@app/common/config';
import { Chat } from '@app/common/database/entities/chat.entity';
import { User } from '@app/common/database/entities/user.entity';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { TerminusModule } from '@nestjs/terminus';
import { TypeOrmModule } from '@nestjs/typeorm';
import { USER_SERVICE } from '@app/contracts/constants/service-actions/user-service.constant';
import { ChatService } from './services/chat-service.service';
import { ChatController } from './controllers/chat-service.controller';
import { ChatHealthController } from './health/health.controller';
import { I_CHAT_SERVICE } from '@app/contracts/interfaces/service/chat-service.interface';

@Module({
  imports: [
    ConfigModule,
    LoggerModule,
    DatabaseModule,
    JwtModule,
    RedisModule,
    TerminusModule,
    TypeOrmModule.forFeature([User, Chat]),
    ClientsModule.registerAsync([
      {
        name: USER_SERVICE.NAME,
        useFactory: (configService: ConfigService) => ({
          transport: Transport.TCP,
          options: {
            host: configService.get<string>('services.user.host'),
            port: configService.get<number>('services.user.port'),
          },
        }),
        inject: [ConfigService],
      },
    ]),
  ],
  controllers: [ChatController, ChatHealthController],
  providers: [
    {
      provide: I_CHAT_SERVICE,
      useClass: ChatService,
    },
    RedisCacheHealthIndicator,
  ],
})
export class ChatServiceModule {}
