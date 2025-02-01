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
    TypeOrmModule.forFeature([ User, UserProfile ])
  ],
  controllers: [RegisterController],
  providers: [
    RegisterService,
    {
      provide: APP_INTERCEPTOR,
      useClass: ClassSerializerInterceptor,
    }
  ],
})
export class AuthServiceModule {}
