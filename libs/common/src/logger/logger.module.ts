import { Module } from '@nestjs/common';
import { LoggerModule as PinoLoggerModule } from 'nestjs-pino';

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
        })
    ]
})
export class LoggerModule {}
