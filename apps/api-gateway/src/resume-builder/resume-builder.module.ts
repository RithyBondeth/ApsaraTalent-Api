import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { RESUME_BUILDER_SERVICE } from 'utils/constants/resume-builder-service';
import { ResumeBuilderController } from './resume-builder.controller';
import { ConfigService } from '@nestjs/config';

@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: RESUME_BUILDER_SERVICE.NAME,
        useFactory: (configService: ConfigService) => ({
          transport: Transport.TCP,
          options: {
            host: configService.get<string>('RESUME_SERVICE_HOST'),
            port: configService.get<number>('RESUME_SERVICE_PORT'),
          },
        }),
        inject: [ConfigService],
      },
    ]),
  ],
  controllers: [ResumeBuilderController],
})
export class ResumeBuilderModule {}
