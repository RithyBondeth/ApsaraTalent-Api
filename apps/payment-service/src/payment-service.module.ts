import { ConfigValuesHealthIndicator, LoggerModule } from '@app/common';
import { ConfigModule } from '@app/common/config';
import { DatabaseModule } from '@app/common/database/database.module';
import { Company } from '@app/common/database/entities/company/company.entity';
import { PaymentTransaction } from '@app/common/database/entities/payment/payment-transaction.entity';
import { Payment } from '@app/common/database/entities/payment/payment.entity';
import { User } from '@app/common/database/entities/user.entity';
import { Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { TerminusModule } from '@nestjs/terminus';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BakongRateLimitGuard } from './guards/bakong-rate-limit.guard';
import { PaymentHealthController } from './health/health.controller';
import { BakongLoggingInterceptor } from './interceptors/bakong.interceptor';
import { PaymentController } from './payment-service.controller';
import { PaymentService } from './payment-service.service';
import { I_PAYMENT_SERVICE } from '@app/contracts/interfaces/service/payment-service.interface';

@Module({
  imports: [
    ConfigModule,
    LoggerModule,
    DatabaseModule,
    TerminusModule,
    TypeOrmModule.forFeature([Payment, PaymentTransaction, User, Company]),
  ],
  controllers: [PaymentController, PaymentHealthController],
  providers: [
    {
      provide: I_PAYMENT_SERVICE,
      useClass: PaymentService,
    },
    ConfigValuesHealthIndicator,
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
