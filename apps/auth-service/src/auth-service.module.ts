import { LoggerModule } from '@app/common';
import { ConfigModule } from '@app/common/config';
import { DatabaseModule } from '@app/common/database/database.module';
import { CareerScope } from '@app/common/database/entities/career-scope.entity';
import { Benefit } from '@app/common/database/entities/company/benefit.entity';
import { Company } from '@app/common/database/entities/company/company.entity';
import { Job } from '@app/common/database/entities/company/job.entity';
import { Value } from '@app/common/database/entities/company/value.entity';
import { Education } from '@app/common/database/entities/employee/education.entity';
import { Employee } from '@app/common/database/entities/employee/employee.entity';
import { Experience } from '@app/common/database/entities/employee/experience.entity';
import { Skill } from '@app/common/database/entities/employee/skill.entity';
import { Social } from '@app/common/database/entities/social.entity';
import { User } from '@app/common/database/entities/user.entity';
import { EmailModule } from '@app/common/email/email.module';
import { JwtModule } from '@app/common/jwt/jwt.module';
import { MessageModule } from '@app/common/message/message.module';
import { UploadfileModule } from '@app/common/uploadfile/uploadfile.module';
import { ClassSerializerInterceptor, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { TypeOrmModule } from '@nestjs/typeorm';
import { USER_SERVICE } from 'utils/constants/user-service.constant';
import { ForgotPasswordController } from './basic/controllers/forgot-password.controller';
import { LoginOTPController } from './basic/controllers/login-otp.controller';
import { LoginController } from './basic/controllers/login.controller';
import { RefreshTokenController } from './basic/controllers/refresh-token.controller';
import { RegisterController } from './basic/controllers/register.controller';
import { ResetPasswordController } from './basic/controllers/reset-password.controller';
import { VerifyEmailController } from './basic/controllers/verify-email.controller';
import { ForgotPasswordService } from './basic/services/forgot-password.service';
import { LoginOTPService } from './basic/services/login-otp.service';
import { LoginService } from './basic/services/login.service';
import { RefreshTokenService } from './basic/services/refresh-token.service';
import { RegisterService } from './basic/services/register.service';
import { ResetPasswordService } from './basic/services/reset-password.service';
import { VerifyEmailService } from './basic/services/verify-email.service';
import { FacebookAuthController } from './socials/controllers/facebook-auth.controller';
import { GithubAuthController } from './socials/controllers/github-auth.controller';
import { GoogleAuthController } from './socials/controllers/google-auth.controller';
import { LinkedInAuthController } from './socials/controllers/linkedin-auth.controller';
import { FacebookAuthService } from './socials/services/facebook-auth.service';
import { GithubAuthService } from './socials/services/github-auth.service';
import { GoogleAuthService } from './socials/services/google-auth.service';
import { LinkedInAuthService } from './socials/services/linkedin-auth.service';

@Module({
  imports: [
    ConfigModule,
    LoggerModule,
    JwtModule,
    DatabaseModule,
    UploadfileModule,
    EmailModule,
    MessageModule,
    TypeOrmModule.forFeature([
      User,
      Company,
      Employee,
      Skill,
      CareerScope,
      Benefit,
      Value,
      Social,
      Experience,
      Education,
      Job,
    ]),
    ClientsModule.registerAsync([
      {
        name: USER_SERVICE.NAME,
        useFactory: (configService: ConfigService) => ({
          transport: Transport.TCP,
          options: {
            host: configService.get<string>('services.user.host'),
            port: configService.get<number>('services.user.port'),
          },
        }),
        inject: [ConfigService],
      },
    ]),
  ],
  controllers: [
    RegisterController,
    LoginController,
    ForgotPasswordController,
    ResetPasswordController,
    RefreshTokenController,
    VerifyEmailController,
    GoogleAuthController,
    LinkedInAuthController,
    GithubAuthController,
    FacebookAuthController,
    LoginOTPController,
  ],
  providers: [
    RegisterService,
    LoginService,
    ForgotPasswordService,
    ResetPasswordService,
    RefreshTokenService,
    VerifyEmailService,
    GoogleAuthService,
    LinkedInAuthService,
    GithubAuthService,
    FacebookAuthService,
    LoginOTPService,
    {
      provide: APP_INTERCEPTOR,
      useClass: ClassSerializerInterceptor,
    },
  ],
})
export class AuthServiceModule {}
