import { Module } from '@nestjs/common';
import { LoggerModule as PinoLoggerModule } from 'nestjs-pino';

@Module({
<<<<<<< HEAD
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
=======
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
  exports: [PinoLoggerModule],
>>>>>>> c4eaba4638ff660126b81b33f459ea47796036af
})
export class LoggerModule {}
