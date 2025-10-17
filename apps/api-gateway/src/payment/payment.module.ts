import { Module } from '@nestjs/common';
import { PaymentController } from './payment.controller';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { PAYMENT_SERVICE } from 'utils/constants/payment-service.constant';
import { ConfigService } from '@nestjs/config';
import { DatabaseModule } from '@app/common';

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
