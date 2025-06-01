import { ClassSerializerInterceptor, Module } from '@nestjs/common';
import { JwtModule, LoggerModule } from '@app/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { UploadfileModule } from '@app/common/uploadfile/uploadfile.module';
import { ServeStaticModule } from '@nestjs/serve-static';
import { HealthController } from './health/health.controller';
import * as path from 'path';
import { TerminusModule } from '@nestjs/terminus';
import { ResumeBuilderModule } from './resume-builder/resume-builder.module';
import { UserModule } from './user/user.module';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    ConfigModule.forRoot({ 
      isGlobal: true,
      envFilePath: './apps/api-gateway/.env',
    }), 
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
    JwtModule
  ],
  controllers: [HealthController],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: ClassSerializerInterceptor,
     
    }
  ],
})
export class ApiGatewayModule {}
