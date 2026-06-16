import {
  DatabaseModule,
  LoggerModule,
  RedisCacheHealthIndicator,
  UploadfileModule,
} from '@app/common';
import { RedisModule } from '@app/common/redis/redis.module';
import { ConfigModule } from '@app/common/config';
import { MetricsModule } from '@app/common/metrics/metrics.module';
import { ResumeTemplate } from '@app/common/database/entities/resume-template.entity';
import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ResumeHealthController } from './health/health.controller';
import { ResumeBuilderController } from './controllers/resume-builder.controller';
import { ResumeTemplateController } from './controllers/resume-template.controller';
import { ImageService } from './services/image.service';
import { ResumeBuilderService } from './services/resume-builder.service';
import { PdfGeneratorService } from './services/pdf-generator.service';
import { ResumeTemplateSeedService } from './services/seed/resume-template-seed.service';
import { ResumeTemplateService } from './services/resume-template.service';

import {
  I_RESUME_BUILDER_SERVICE,
  I_RESUME_TEMPLATE_SERVICE,
} from '@app/contracts/interfaces/service/resume-builder-service.interface';

@Module({
  imports: [
    ConfigModule,
    MetricsModule,
    LoggerModule,
    DatabaseModule,
    UploadfileModule,
    RedisModule,
    TerminusModule,
    TypeOrmModule.forFeature([ResumeTemplate]),
  ],
  controllers: [
    ResumeBuilderController,
    ResumeTemplateController,
    ResumeHealthController,
  ],
  providers: [
    { provide: I_RESUME_BUILDER_SERVICE, useClass: ResumeBuilderService },
    ImageService,
    PdfGeneratorService,
    { provide: I_RESUME_TEMPLATE_SERVICE, useClass: ResumeTemplateService },
    ResumeTemplateSeedService,
    RedisCacheHealthIndicator,
  ],
})
export class ResumeBuilderServiceModule {}
