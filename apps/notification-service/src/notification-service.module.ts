import { DatabaseModule, LoggerModule } from '@app/common';
import { ConfigModule } from '@app/common/config';
import { Notification } from '@app/common/database/entities/notification.entity';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationServiceController } from './notification-service.controller';
import { NotificationServiceService } from './notification-service.service';

@Module({
  imports: [
    ConfigModule,
    LoggerModule,
    DatabaseModule,
    TypeOrmModule.forFeature([Notification]),
  ],
  controllers: [NotificationServiceController],
  providers: [NotificationServiceService],
})
export class NotificationServiceModule {}
