import { DatabaseModule, LoggerModule } from '@app/common';
import { ConfigModule } from '@app/common/config';
import { Notification } from '@app/common/database/entities/notification.entity';
import { User } from '@app/common/database/entities/user.entity';
import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationHealthController } from './health/health.controller';
import { NotificationServiceController } from './notification-service.controller';
import { NotificationServiceService } from './notification-service.service';
import { PushNotificationService } from './push-notification.service';

import { I_NOTIFICATION_SERVICE } from '@app/contracts/interfaces/notification-service.interface';

@Module({
  imports: [
    ConfigModule,
    LoggerModule,
    DatabaseModule,
    TerminusModule,
    TypeOrmModule.forFeature([Notification, User]),
  ],
  controllers: [NotificationServiceController, NotificationHealthController],
  providers: [
    {
      provide: I_NOTIFICATION_SERVICE,
      useClass: NotificationServiceService,
    },
    PushNotificationService,
  ],
})
export class NotificationServiceModule {}
