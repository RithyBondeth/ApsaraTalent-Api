import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { PaymentServiceController } from './payment-service.controller';
import { PaymentServiceService } from './payment-service.service';
import { LoggerModule } from '@app/common';
import { ConfigModule } from '@app/common/config';
import { DatabaseModule } from '@app/common/database/database.module';
import { Payment } from '@app/common/database/entities/payment/payment.entity';
import { PaymentTransaction } from '@app/common/database/entities/payment/payment-transaction.entity';
import { User } from '@app/common/database/entities/user.entity';
import { Company } from '@app/common/database/entities/company/company.entity';
import { BakongRateLimitGuard } from './guards/bakong-rate-limit.guard';
import { BakongLoggingInterceptor } from './interceptors/bakong.interceptor';

@Module({
  imports: [
    ConfigModule,
    LoggerModule,
    DatabaseModule,
    TypeOrmModule.forFeature([Payment, PaymentTransaction, User, Company]),
  ],
  controllers: [PaymentServiceController],
  providers: [
    PaymentServiceService,
    // Apply Bakong rate limiting globally to this service
    {
      provide: APP_GUARD,
      useClass: BakongRateLimitGuard,
    },
    // Apply Bakong logging interceptor globally to this service
    {
      provide: APP_INTERCEPTOR,
      useClass: BakongLoggingInterceptor,
    },
  ],
})
export class PaymentServiceModule {}
