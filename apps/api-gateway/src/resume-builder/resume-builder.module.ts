import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { RESUME_BUILDER_SERVICE } from 'utils/constants/resume-builder-service';
import { ConfigService } from '@nestjs/config';
import { ResumeBuilderController } from './controllers/resume-builder.controller';
import { ResumeTemplateController } from './controllers/resume-template.controller';
import { JwtModule, UploadfileModule } from '@app/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '@app/common/database/entities/user.entity';

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
    JwtModule,
    TypeOrmModule.forFeature([User])
  ],
  controllers: [ResumeBuilderController, ResumeTemplateController],
})
export class ResumeBuilderModule {}
