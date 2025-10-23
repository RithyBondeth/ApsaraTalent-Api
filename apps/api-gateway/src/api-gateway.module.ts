import { ClassSerializerInterceptor, Module } from '@nestjs/common';
import { JwtModule, LoggerModule } from '@app/common';
import { ConfigModule } from '@app/common/config';
import { AuthModule } from './auth/auth.module';
import { UploadfileModule } from '@app/common/uploadfile/uploadfile.module';
import { ServeStaticModule } from '@nestjs/serve-static';
import { HealthController } from './health/health.controller';
import * as path from 'path';
import { TerminusModule } from '@nestjs/terminus';
import { ResumeBuilderModule } from './resume-builder/resume-builder.module';
import { UserModule } from './user/user.module';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ChatModule } from './chat/chat.module';
import { JobModule } from './job/job.module';
import { PaymentModule } from './payment/payment.module';
import { NotificationModule } from './notification/notification.module';

@Module({
  imports: [
    ConfigModule,
    LoggerModule,
    AuthModule,
    UploadfileModule,
    TerminusModule,
    ResumeBuilderModule,
    ServeStaticModule.forRoot({
      rootPath: path.join(process.cwd(), 'storage'),
      serveRoot: '/storage',
    }),
    UserModule,
    JwtModule,
    ChatModule,
    JobModule,
    PaymentModule,
    NotificationModule,
  ],
  controllers: [HealthController],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: ClassSerializerInterceptor,
    },
  ],
})
export class ApiGatewayModule {}
