import { JwtModule, UploadfileModule } from '@app/common';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { RESUME_BUILDER_SERVICE } from '@app/contracts/constants/service-actions/resume-builder-service.constant';
import { ResumeBuilderController } from './controllers/resume-builder.controller';
import { ResumeTemplateController } from './controllers/resume-template.controller';

@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: RESUME_BUILDER_SERVICE.NAME,
        useFactory: (configService: ConfigService) => ({
          transport: Transport.TCP,
          options: {
            host: configService.get<string>('services.resume.host'),
            port: configService.get<number>('services.resume.port'),
          },
        }),
        inject: [ConfigService],
      },
    ]),
    UploadfileModule,
    JwtModule,

  ],
  controllers: [ResumeBuilderController, ResumeTemplateController],
})
export class ResumeBuilderModule {}
