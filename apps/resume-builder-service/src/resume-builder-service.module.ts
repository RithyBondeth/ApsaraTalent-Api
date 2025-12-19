import { Module } from '@nestjs/common';
import { ResumeBuilderController } from './controllers/resume-builder.controller';
import { ResumeBuilderService } from './services/resume-builder.service';
import { ImageService } from './services/image.service';
import { ConfigModule } from '@app/common/config';
import { DatabaseModule, LoggerModule, UploadfileModule } from '@app/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ResumeTemplate } from '@app/common/database/entities/resume-template.entity';
import { ResumeTemplateService } from './services/resume-template.service';
import { ResumeTemplateController } from './controllers/resume-template.controller';

@Module({
  imports: [
    ConfigModule,
    LoggerModule,
    DatabaseModule,
    UploadfileModule,
    TypeOrmModule.forFeature([ResumeTemplate]),
  ],
  controllers: [ResumeBuilderController, ResumeTemplateController],
  providers: [ResumeBuilderService, ImageService, ResumeTemplateService],
})
export class ResumeBuilderServiceModule {}
