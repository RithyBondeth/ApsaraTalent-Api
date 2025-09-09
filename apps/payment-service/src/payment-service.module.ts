import { Module } from '@nestjs/common';
import { PaymentServiceController } from './payment-service.controller';
import { PaymentServiceService } from './payment-service.service';
import { ConfigModule } from '@app/common/config';
import { LoggerModule } from '@app/common';

@Module({
  imports: [ConfigModule, LoggerModule],
  controllers: [PaymentServiceController],
  providers: [PaymentServiceService],
})
export class PaymentServiceModule {}
