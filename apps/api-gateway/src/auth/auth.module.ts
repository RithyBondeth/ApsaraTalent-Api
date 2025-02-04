import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { AUTH_SERVICE } from 'utils/constants/auth-service.constant';
import { ThrottlerModule } from '@app/common';

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
    ]),
    ThrottlerModule,
  ],
  controllers: [AuthController],
  providers: [],
})
export class AuthModule {}
