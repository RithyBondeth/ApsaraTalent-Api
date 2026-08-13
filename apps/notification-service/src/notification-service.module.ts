import { DatabaseModule, LoggerModule } from '@app/common';
import { ConfigModule } from '@app/common/config';
import { RedisModule } from '@app/common/redis/redis.module';
import { MetricsModule } from '@app/common/metrics/metrics.module';
import { Notification } from '@app/common/database/entities/notification.entity';
import { User } from '@app/common/database/entities/user.entity';
import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationHealthController } from './health/health.controller';
import { NotificationController } from './notifications/controllers/notification-service.controller';
import { NotificationService } from './notifications/services/notification-service.service';
import { PushNotificationService } from './notifications/services/push-notification.service';
import { I_NOTIFICATION_SERVICE } from '@app/contracts/interfaces/service/notification-service.interface';

@Module({
  imports: [
    ConfigModule,
    MetricsModule,
    LoggerModule,
    DatabaseModule,
    RedisModule,
    TerminusModule,
    TypeOrmModule.forFeature([Notification, User]),
  ],
  controllers: [NotificationController, NotificationHealthController],
  providers: [
    {
      provide: I_NOTIFICATION_SERVICE,
      useClass: NotificationService,
    },
    PushNotificationService,
  ],
})
export class NotificationServiceModule {}
