import { JwtModule, LoggerModule, ThrottlerModule } from '@app/common';
import { ThrottlerGuard } from '@app/common/throttler/guards/throttler.guard';
import { ConfigModule } from '@app/common/config';
import { UploadfileModule } from '@app/common/uploadfile/uploadfile.module';
import { ClassSerializerInterceptor, Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { AdminModule } from './admin/admin.module';
import { AuthModule } from './auth/auth.module';
import { ChatModule } from './chat/chat.module';
import { StorageHttpModule } from './storage/storage-http.module';
import { HealthModule } from './health/health.module';
import { JobModule } from './job/job.module';
import { NotificationModule } from './notification/notification.module';
import { ResumeBuilderModule } from './resume-builder/resume-builder.module';
import { SocketModule } from './shared/socket/socket.module';
import { UserModule } from './user/user.module';
import { MetricsModule } from '@app/common/metrics/metrics.module';
import { AiQuotaModule } from '@app/common/throttler/ai-quota.module';
import { SentryModule } from '@sentry/nestjs/setup';
// Drives the login_history 90-day retention job.
import { ScheduleModule } from '@nestjs/schedule';
import { AiModule } from './ai/ai.module';

@Module({
  imports: [
    SentryModule.forRoot(),
    ScheduleModule.forRoot(),
    ConfigModule,
    LoggerModule,
    AiQuotaModule,
    AiModule,
    AuthModule,
    AdminModule,
    UploadfileModule,
    StorageHttpModule,
    HealthModule,
    ResumeBuilderModule,
    UserModule,
    JwtModule,
    SocketModule,
    ChatModule,
    JobModule,
    NotificationModule,
    MetricsModule,
    ThrottlerModule,
  ],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: ClassSerializerInterceptor,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class ApiGatewayModule {}
