import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { AUTH_SERVICE } from '@app/common/constants/auth-service.constant';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: AUTH_SERVICE.NAME,
        transport: Transport.TCP,
        options: {
          host: 'localhost',
          port: 3001,
        },
      }
    ])
  ],
  controllers: [AuthController],
  providers: [],
})
export class AuthModule {}
