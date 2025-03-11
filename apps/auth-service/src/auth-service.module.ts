import { ClassSerializerInterceptor, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from '@app/common';
import { DatabaseModule } from '@app/common/database/database.module';
import { RegisterService } from './basic/services/register.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@app/common/jwt/jwt.module';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { UploadfileModule } from '@app/common/uploadfile/uploadfile.module';
import { LoginService } from './basic/services/login.service';
import { EmailModule } from '@app/common/email/email.module';
import { ForgotPasswordService } from './basic/services/forgot-password.service';
import { ResetPasswordService } from './basic/services/reset-password.service';
import { RefreshTokenService } from './basic/services/refresh-token.service';
import { VerifyEmailService } from './basic/services/verify-email.service';
import { GoogleAuthController } from './socials/controllers/google-auth.controlle';
import { RegisterController } from './basic/controllers/register.controller';
import { LoginController } from './basic/controllers/login.controller';
import { ForgotPasswordController } from './basic/controllers/forgot-password.controller';
import { ResetPasswordController } from './basic/controllers/reset-password.controller';
import { VerifyEmailController } from './basic/controllers/verify-email.controller';
import { RefreshTokenController } from './basic/controllers/refresh-token.controller';
import { GoogleAuthService } from './socials/services/google-auth.service';
import { User } from '@app/common/database/entities/user.entiry';
import { Company } from '@app/common/database/entities/company/company.entity';
import { Employee } from '@app/common/database/entities/employee/employee.entiry';
import { Skill } from '@app/common/database/entities/employee/skill.entity';
import { CareerScope } from '@app/common/database/entities/career-scope.entity';
import { Benefit } from '@app/common/database/entities/company/benefit.entity';
import { Value } from '@app/common/database/entities/company/value.entity';
import { Social } from '@app/common/database/entities/social.entity';
import { Experience } from '@app/common/database/entities/employee/experince.entity';
import { Education } from '@app/common/database/entities/employee/education.entity';
import { Job } from '@app/common/database/entities/company/job.entity';

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
    TypeOrmModule.forFeature([ User, Company, Employee, Skill, CareerScope, Benefit, Value, Social, Experience, Education, Job ])
  ],
  controllers: [
    RegisterController, 
    LoginController, 
    ForgotPasswordController, 
    ResetPasswordController,
    RefreshTokenController,
    VerifyEmailController,
    GoogleAuthController,
  ],
  providers: [
    RegisterService,
    LoginService,
    ForgotPasswordService,
    ResetPasswordService,
    RefreshTokenService,
    VerifyEmailService,
    GoogleAuthService,
    {
      provide: APP_INTERCEPTOR,
      useClass: ClassSerializerInterceptor,
    }
  ],
})
export class AuthServiceModule {}
