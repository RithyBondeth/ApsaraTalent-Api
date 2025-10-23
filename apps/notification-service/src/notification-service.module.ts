import { Module } from '@nestjs/common';
import { NotificationServiceController } from './notification-service.controller';
import { NotificationServiceService } from './notification-service.service';
import { ConfigModule } from '@app/common/config';
import { LoggerModule } from '@app/common';

@Module({
  imports: [ConfigModule, LoggerModule],
  controllers: [NotificationServiceController],
  providers: [NotificationServiceService],
})
export class NotificationServiceModule {}
