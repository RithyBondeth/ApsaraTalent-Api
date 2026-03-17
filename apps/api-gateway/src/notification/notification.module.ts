import { DatabaseModule, JwtModule } from '@app/common';
import { User } from '@app/common/database/entities/user.entity';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NOTIFICATION_SERVICE } from 'utils/constants/notification.constant';
import { NotificationController } from './notification.controller';

@Module({
  imports: [
    ClientsModule.registerAsync([
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
    DatabaseModule,
    JwtModule,
    TypeOrmModule.forFeature([User]),
  ],
  controllers: [NotificationController],
})
export class NotificationModule {}
