import { Module } from '@nestjs/common';
import { LoggerModule } from '@app/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';

@Module({
  imports: [
    ConfigModule.forRoot({ 
      isGlobal: true,
      envFilePath: './apps/api-gateway/.env',
    }), 
    LoggerModule, AuthModule, UserModule
  ],
  controllers: [],
  providers: [],
})
export class ApiGatewayModule {}
