import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PlasgateSmsService } from './plasgate-sms.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: './libs/.env',
    }),
  ],
  providers: [PlasgateSmsService],
  exports: [PlasgateSmsService],
})
export class PlasgateSmsModule {}
