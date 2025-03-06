import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { AUTH_SERVICE } from 'utils/constants/auth-service.constant';
import { ThrottlerModule } from '@app/common';
import { GoogleController } from './socials/controllers/google.controller';
import { GoogleStrategy } from './socials/strategies/google.strategy';
import { LinkedInStrategy } from './socials/strategies/linkedin-strategy';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: AUTH_SERVICE.NAME,
        transport: Transport.TCP,
        options: {
          host: '127.0.0.1',
          port: 4001,
        },
      }
    ]),
    ThrottlerModule,
  ],
  controllers: [
    AuthController,
    GoogleController
  ],
  providers: [
    //GoogleStrategy, 
    //LinkedInStrategy,
  ],
})
export class AuthModule {}
