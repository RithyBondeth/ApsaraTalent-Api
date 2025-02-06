import { Module } from '@nestjs/common';
import { ResumeBuilderServiceController } from './controllers/resume-builder-service.controller';
import { ResumeBuilderServiceService } from './services/resume-builder-service.service';
import { LoggerModule } from '@app/common';

@Module({
  imports: [LoggerModule],
  controllers: [ResumeBuilderServiceController],
  providers: [ResumeBuilderServiceService],
})
export class ResumeBuilderServiceModule {}
