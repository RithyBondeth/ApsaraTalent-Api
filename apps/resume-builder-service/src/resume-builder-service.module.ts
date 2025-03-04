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
})
export class ResumeBuilderServiceModule {}
