import { DatabaseModule, LoggerModule, UploadfileModule } from '@app/common';
import { ConfigModule } from '@app/common/config';
import { ResumeTemplate } from '@app/common/database/entities/resume-template.entity';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ResumeBuilderController } from './controllers/resume-builder.controller';
import { ResumeTemplateController } from './controllers/resume-template.controller';
import { ImageService } from './services/image.service';
import { ResumeBuilderService } from './services/resume-builder.service';
import { ResumeTemplateSeedService } from './services/resume-template-seed.service';
import { ResumeTemplateService } from './services/resume-template.service';

@Module({
  imports: [
    ConfigModule,
    LoggerModule,
    DatabaseModule,
    UploadfileModule,
    TypeOrmModule.forFeature([ResumeTemplate]),
  ],
  controllers: [ResumeBuilderController, ResumeTemplateController],
  providers: [ResumeBuilderService, ImageService, ResumeTemplateService, ResumeTemplateSeedService],
})
export class ResumeBuilderServiceModule {}
