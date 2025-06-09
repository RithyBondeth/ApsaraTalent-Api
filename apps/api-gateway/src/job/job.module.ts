import { Module } from '@nestjs/common';
import { JobController } from './job.controller';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { JOB_SERVICE } from 'utils/constants/job-service.constant';
import { ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@app/common';

@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: JOB_SERVICE.NAME,
        useFactory: (configService: ConfigService) => ({
          transport: Transport.TCP,
          options: {
            host: configService.get<string>('JOB_SERVICE_HOST'),
            port: configService.get<number>('JOB_SERVICE_PORT'),
          }
        }),
        inject: [ConfigService]
      }
    ]),
    ThrottlerModule,
  ],
  controllers: [JobController],
  providers: [],
})
export class JobModule {}
