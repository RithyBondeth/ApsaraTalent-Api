import { Module } from '@nestjs/common';
import { LoggerModule } from '@app/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { UploadfileModule } from '@app/common/uploadfile/uploadfile.module';
import { ServeStaticModule } from '@nestjs/serve-static';
import * as path from 'path';

@Module({
  imports: [
    ConfigModule.forRoot({ 
      isGlobal: true,
      envFilePath: './apps/api-gateway/.env',
    }), 
    LoggerModule, AuthModule, UserModule, UploadfileModule,
    ServeStaticModule.forRoot({
      rootPath: path.join(process.cwd(), 'storage'),
      serveRoot: '/storage',
    })
  ],
  controllers: [],
  providers: [],
})
export class ApiGatewayModule {}
