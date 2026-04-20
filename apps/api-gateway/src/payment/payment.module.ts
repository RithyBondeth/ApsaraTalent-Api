import { DatabaseModule } from '@app/common';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { PAYMENT_SERVICE } from '@app/contracts/constants/service-actions/payment-service.constant';
import { PaymentController } from './controllers/payment.controller';

@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: PAYMENT_SERVICE.NAME,
        useFactory: (configService: ConfigService) => ({
          transport: Transport.TCP,
          options: {
            host: configService.get<string>('services.payment.host'),
            port: configService.get<number>('services.payment.port'),
          },
        }),
        inject: [ConfigService],
      },
    ]),
    DatabaseModule,
  ],
  controllers: [PaymentController],
})
export class PaymentModule {}
