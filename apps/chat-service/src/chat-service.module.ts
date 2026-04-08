import { DatabaseModule, JwtModule, LoggerModule } from '@app/common';
import { RedisModule } from '@app/common/redis/redis.module';
import { ConfigModule } from '@app/common/config';
import { Chat } from '@app/common/database/entities/chat.entity';
import { User } from '@app/common/database/entities/user.entity';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { TypeOrmModule } from '@nestjs/typeorm';
import { USER_SERVICE } from '@app/contracts/constants/user-service.constant';
import { ChatServiceService } from './chat-service.service';
import { ChatServiceController } from './chat-service.controller';
import { I_CHAT_SERVICE } from '@app/contracts/interfaces/chat-service.interface';

@Module({
  imports: [
    ConfigModule,
    LoggerModule,
    DatabaseModule,
    JwtModule,
    RedisModule,
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
  controllers: [ChatServiceController],
  providers: [
    {
      provide: I_CHAT_SERVICE,
      useClass: ChatServiceService,
    },
  ],
})
export class ChatServiceModule {}
