import { ClassSerializerInterceptor, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from '@app/common';
import { DatabaseModule } from '@app/common/database/database.module';
import { RegisterController } from './controllers/register.controller';
import { RegisterService } from './services/register.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '@app/common/database/entities/user.entity';
import { UserProfile } from '@app/common/database/entities/user-profile.entity';
import { JwtModule } from '@app/common/jwt/jwt.module';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { UploadfileModule } from '@app/common/uploadfile/uploadfile.module';
import { LoginController } from './controllers/login.controller';
import { LoginService } from './services/login.service';
import { EmailModule } from '@app/common/email/email.module';
import { ForgotPasswordController } from './controllers/forgot-password.controller';
import { ForgotPasswordService } from './services/forgot-password.service';
import { ResetPasswordService } from './services/reset-password.service';
import { ResetPasswordController } from './controllers/reset-password.controller';
import { RefreshTokenController } from './controllers/refresh-token.controller';
import { RefreshTokenService } from './services/refresh-token.service';
import { VerifyEmailController } from './controllers/verify-email.controller';
import { VerifyEmailService } from './services/verify-email.service';

@Module({
  imports: [
    ConfigModule.forRoot({
        isGlobal: true,
        envFilePath: './apps/auth-service/.env',
    }),
    LoggerModule,
    JwtModule,
    DatabaseModule,
    UploadfileModule,
    EmailModule,
    TypeOrmModule.forFeature([ User, UserProfile ])
  ],
  controllers: [
    RegisterController, 
    LoginController, 
    ForgotPasswordController, 
    ResetPasswordController,
    RefreshTokenController,
    VerifyEmailController
  ],
  providers: [
    RegisterService,
    LoginService,
    ForgotPasswordService,
    ResetPasswordService,
    RefreshTokenService,
    VerifyEmailService,
    {
      provide: APP_INTERCEPTOR,
      useClass: ClassSerializerInterceptor,
    }
  ],
})
export class AuthServiceModule {}
