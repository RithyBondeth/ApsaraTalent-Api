import { JwtModule, LoggerModule } from '@app/common';
import { ConfigModule } from '@app/common/config';
import { UploadfileModule } from '@app/common/uploadfile/uploadfile.module';
import { ClassSerializerInterceptor, Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ServeStaticModule } from '@nestjs/serve-static';
import * as path from 'path';
import { AiStreamModule } from './ai-stream/ai-stream.module';
import { AuthModule } from './auth/auth.module';
import { ChatModule } from './chat/chat.module';
import { HealthModule } from './health/health.module';
import { JobModule } from './job/job.module';
import { NotificationModule } from './notification/notification.module';
import { ResumeBuilderModule } from './resume-builder/resume-builder.module';
import { SocketModule } from './socket/socket.module';
import { UserModule } from './user/user.module';
import { MetricsModule } from '@app/common/metrics/metrics.module';
import { AiQuotaModule } from '@app/common/throttler/ai-quota.module';
import { SentryModule } from '@sentry/nestjs/setup';
import { AiModule } from './ai/ai.module';

@Module({
  imports: [
    // Enables Sentry request context/tracing. No-op when SENTRY_DSN is unset.
    SentryModule.forRoot(),
    ConfigModule,
    LoggerModule,
    AiStreamModule,
    AiQuotaModule,
    AiModule,
    AuthModule,
    UploadfileModule,
    HealthModule,
    ResumeBuilderModule,
    ServeStaticModule.forRoot({
      rootPath: path.join(process.cwd(), 'storage'),
      serveRoot: '/storage',
    }),
    UserModule,
    JwtModule,
    SocketModule,
    ChatModule,
    JobModule,
    NotificationModule,
    MetricsModule,
  ],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: ClassSerializerInterceptor,
    },
  ],
})
export class ApiGatewayModule {}
