import { Module } from '@nestjs/common';
import { AuthServiceController } from './controllers/auth-service.controller';
import { AuthServiceService } from './services/auth-service.service';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from '@app/common';
import { DatabaseModule } from '@app/common/database/database.module';

@Module({
  imports: [
    ConfigModule.forRoot({
        isGlobal: true,
        envFilePath: './apps/auth-service/.env',
    }),
    LoggerModule,
    DatabaseModule,
  ],
  controllers: [AuthServiceController],
  providers: [AuthServiceService],
})
export class AuthServiceModule {}
