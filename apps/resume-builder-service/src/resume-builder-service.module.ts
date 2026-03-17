<<<<<<< HEAD
import { Module } from '@nestjs/common';
import { BuildeResumeController } from './controllers/build-resume.controller';
import { BuildResumeService } from './services/build-resume.service';
import { ImageService } from './services/image.service';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from '@app/common';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: './apps/resume-builder-service/.env',
    }),
    LoggerModule,
  ],
  controllers: [BuildeResumeController],
  providers: [BuildResumeService, ImageService],
=======
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
>>>>>>> c4eaba4638ff660126b81b33f459ea47796036af
})
export class ResumeBuilderServiceModule {}
