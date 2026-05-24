import { JwtModule, ThrottlerModule } from '@app/common';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { JOB_SERVICE } from '@app/contracts/constants/service-actions/job-service.constant';
import { USER_SERVICE } from '@app/contracts/constants/service-actions/user-service.constant';
import { ApplicationController } from './controllers/application.controller';
import { InterviewController } from './controllers/interview.controller';
import { JobController } from './controllers/job.controller';
import { JobMatchingController } from './controllers/matching.controller';
import { AiMatchingService } from './services/ai-matching.service';

@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: JOB_SERVICE.NAME,
        useFactory: (configService: ConfigService) => ({
          transport: Transport.TCP,
          options: {
            host: configService.get<string>('services.job.host'),
            port: configService.get<number>('services.job.port'),
          },
        }),
        inject: [ConfigService],
      },
      {
        name: USER_SERVICE.NAME,
        useFactory: (configService: ConfigService) => ({
          transport: Transport.TCP,
          options: {
            host: configService.get<string>('services.user.host'),
            port: configService.get<number>('services.user.port'),
          },
        }),
        inject: [ConfigService],
      },
    ]),
    ThrottlerModule,
    JwtModule,
  ],
  controllers: [
    JobController,
    JobMatchingController,
    InterviewController,
    ApplicationController,
  ],
  providers: [AiMatchingService],
})
export class JobModule {}
