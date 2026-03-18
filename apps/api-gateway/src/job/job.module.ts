import { JwtModule, ThrottlerModule } from '@app/common';
import { User } from '@app/common/database/entities/user.entity';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JOB_SERVICE } from 'utils/constants/job-service.constant';
import { USER_SERVICE } from 'utils/constants/user-service.constant';
import { JobController } from './controllers/job.controller';
import { JobMatchingController } from './controllers/matching.controller';

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
    TypeOrmModule.forFeature([User]),
  ],
  controllers: [JobController, JobMatchingController],
  providers: [],
})
export class JobModule {}
