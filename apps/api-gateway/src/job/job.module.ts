import { Module } from '@nestjs/common';
import { JobController } from './controllers/job.controller';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { JOB_SERVICE } from 'utils/constants/job-service.constant';
import { ConfigService } from '@nestjs/config';
import { JwtModule, ThrottlerModule } from '@app/common';
import { JobMatchingController } from './controllers/matching.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '@app/common/database/entities/user.entity';

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
    ]),
    ThrottlerModule,
    JwtModule,
    TypeOrmModule.forFeature([User]),
  ],
  controllers: [JobController, JobMatchingController],
  providers: [],
})
export class JobModule {}
