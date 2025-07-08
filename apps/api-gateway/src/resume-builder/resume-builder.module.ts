import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { RESUME_BUILDER_SERVICE } from 'utils/constants/resume-builder-service';
import { ConfigService } from '@nestjs/config';
import { ResumeBuilderController } from './controllers/resume-builder.controller';
import { ResumeTemplateController } from './controllers/resume-template.controller';
import { UploadfileModule } from '@app/common';

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
    UploadfileModule,
  ],
  controllers: [ResumeBuilderController, ResumeTemplateController],
})
export class ResumeBuilderModule {}
