import { JwtModule, LoggerModule } from '@app/common';
import { ConfigModule } from '@app/common/config';
import { UploadfileModule } from '@app/common/uploadfile/uploadfile.module';
import { ClassSerializerInterceptor, Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ServeStaticModule } from '@nestjs/serve-static';
import { TerminusModule } from '@nestjs/terminus';
import * as path from 'path';
import { AuthModule } from './auth/auth.module';
import { ChatModule } from './chat/chat.module';
import { HealthController } from './health/health.controller';
import { JobModule } from './job/job.module';
import { NotificationModule } from './notification/notification.module';
import { PaymentModule } from './payment/payment.module';
import { ResumeBuilderModule } from './resume-builder/resume-builder.module';
import { UserModule } from './user/user.module';
import { UploadfileModule } from '@app/common/uploadfile/uploadfile.module';
import { ServeStaticModule } from '@nestjs/serve-static';
import { HealthController } from './health/health.controller';
import * as path from 'path';
import { TerminusModule } from '@nestjs/terminus';
import { ResumeBuilderModule } from './resume-builder/resume-builder.module';

@Module({
  imports: [
<<<<<<< HEAD
    ConfigModule.forRoot({ 
      isGlobal: true,
      envFilePath: './apps/api-gateway/.env',
    }), 
    LoggerModule, 
    AuthModule, 
    UserModule, 
    UploadfileModule, 
=======
    ConfigModule,
    LoggerModule,
    AuthModule,
    UploadfileModule,
>>>>>>> c4eaba4638ff660126b81b33f459ea47796036af
    TerminusModule,
    ResumeBuilderModule,
    ServeStaticModule.forRoot({
      rootPath: path.join(process.cwd(), 'storage'),
      serveRoot: '/storage',
    }),
<<<<<<< HEAD
  ],
  controllers: [HealthController],
  providers: [],
=======
    UserModule,
    JwtModule,
    ChatModule,
    JobModule,
    //PaymentModule,
    NotificationModule,
  ],
  controllers: [HealthController],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: ClassSerializerInterceptor,
    },
  ],
>>>>>>> c4eaba4638ff660126b81b33f459ea47796036af
})
export class ApiGatewayModule {}
