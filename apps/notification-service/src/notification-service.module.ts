import { DatabaseModule, LoggerModule } from '@app/common';
import { ConfigModule } from '@app/common/config';
import { EmailModule } from '@app/common/email/email.module';
import { OutboxModule } from '@app/common/outbox/outbox.module';
import { RedisModule } from '@app/common/redis/redis.module';
import { MetricsModule } from '@app/common/metrics/metrics.module';
import { Notification } from '@app/common/database/entities/notification.entity';
import { NotificationPreference } from '@app/common/database/entities/notification-preference.entity';
import { User } from '@app/common/database/entities/user.entity';
import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TerminusModule } from '@nestjs/terminus';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationHealthController } from './health/health.controller';
import { NotificationController } from './notifications/controllers/notification-service.controller';
import { NotificationService } from './notifications/services/notification-service.service';
import { PushNotificationService } from './notifications/services/push-notification.service';
import { NotificationEmailService } from './notifications/services/notification-email.service';
import { OutboxDispatcherService } from './outbox/services/outbox-dispatcher.service';
import { NotificationPreferenceController } from './preferences/controllers/notification-preference.controller';
import { NotificationPreferenceService } from './preferences/services/notification-preference.service';
import { I_NOTIFICATION_SERVICE } from '@app/contracts/interfaces/service/notification-service.interface';

@Module({
  imports: [
    ConfigModule,
    MetricsModule,
    LoggerModule,
    DatabaseModule,
    RedisModule,
    TerminusModule,
    // The outbox dispatcher polls on a timer and prunes on a cron, so this
    // service now needs a scheduler. Nothing else here is scheduled.
    ScheduleModule.forRoot(),
    OutboxModule,
    EmailModule,
    TypeOrmModule.forFeature([Notification, NotificationPreference, User]),
  ],
  controllers: [
    NotificationController,
    NotificationPreferenceController,
    NotificationHealthController,
  ],
  providers: [
    {
      provide: I_NOTIFICATION_SERVICE,
      useClass: NotificationService,
    },
    PushNotificationService,
    NotificationEmailService,
    NotificationPreferenceService,
    OutboxDispatcherService,
  ],
})
export class NotificationServiceModule {}
