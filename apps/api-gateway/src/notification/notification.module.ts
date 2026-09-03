import { JwtModule } from '@app/common';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { NOTIFICATION_SERVICE } from '@app/contracts/constants/service-actions/notification-service.constant';
import { NotificationController } from './controllers/notification.controller';
import { NotificationPreferenceController } from './controllers/notification-preference.controller';

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
    JwtModule,
  ],
  controllers: [NotificationController, NotificationPreferenceController],
})
export class NotificationModule {}
