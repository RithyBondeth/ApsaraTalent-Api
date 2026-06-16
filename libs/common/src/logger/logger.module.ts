import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { LoggerModule as PinoLoggerModule } from 'nestjs-pino';
import { TimingInterceptor } from '../interceptors/timing.interceptor';

@Module({
  imports: [
    PinoLoggerModule.forRoot({
      pinoHttp: {
        level: 'trace',
        transport: {
          targets: [
            {
              target: 'pino-pretty',
              options: {
                destination: './logs/app.log',
                mkdir: true,
                singleLine: true,
              },
            },
            {
              target: 'pino-pretty',
            },
          ],
        },
      },
    }),
  ],
  // Registered here (a module every app imports) so HTTP + RPC timing is
  // captured everywhere without touching each service's bootstrap.
  providers: [{ provide: APP_INTERCEPTOR, useClass: TimingInterceptor }],
  exports: [PinoLoggerModule],
})
export class LoggerModule {}
