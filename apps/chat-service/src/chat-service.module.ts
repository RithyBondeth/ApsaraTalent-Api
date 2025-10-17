import { Module } from '@nestjs/common';
import { ChatServiceService } from './chat-service.service';
import { ConfigModule } from '@app/common/config';
import { DatabaseModule, LoggerModule } from '@app/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '@app/common/database/entities/user.entity';
import { Chat } from '@app/common/database/entities/chat.entity';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { USER_SERVICE } from 'utils/constants/user-service.constant';
import { ConfigService } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule,
    LoggerModule,
    DatabaseModule,
    TypeOrmModule.forFeature([User, Chat]),
    ClientsModule.registerAsync([
      {
        name: USER_SERVICE.NAME,
        useFactory: (configService: ConfigService) => ({
          transport: Transport.TCP,
          options: {
            host: configService.get('USER_SERVICE_HOST'),
            port: parseInt(configService.get('USER_SERVICE_PORT')),
          },
        }),
        inject: [ConfigService],
      },
    ]),
  ],
  controllers: [],
  providers: [ChatServiceService],
})
export class ChatServiceModule {}
