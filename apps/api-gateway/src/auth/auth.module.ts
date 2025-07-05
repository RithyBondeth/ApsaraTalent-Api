import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { AUTH_SERVICE } from 'utils/constants/auth-service.constant';
import { ThrottlerModule } from '@app/common';
import { GoogleController } from './socials/controllers/google.controller';
import { ConfigService } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { GoogleStrategy } from './socials/strategies/google.strategy';
import { LinkedInController } from './socials/controllers/linkedin.controller';
import { LinkedInStrategy } from './socials/strategies/linkedin-strategy';
import { GithubController } from './socials/controllers/github.controller';

@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: AUTH_SERVICE.NAME,
        useFactory: (configService: ConfigService) => ({
          transport: Transport.TCP,
          options: {
            host: configService.get<string>('AUTH_SERVICE_HOST'),
            port: configService.get<number>('AUTH_SERVICE_PORT'),
          },
        }),
        inject: [ConfigService]
      }
    ]),
    ThrottlerModule,
    PassportModule,
  ],
  controllers: [
    AuthController,
    GoogleController,
    LinkedInController,
    GithubController,
  ],
  providers: [GoogleStrategy, LinkedInStrategy],
})
export class AuthModule {}
