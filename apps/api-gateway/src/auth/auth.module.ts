import { JwtModule, ThrottlerModule } from '@app/common';
import { User } from '@app/common/database/entities/user.entity';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AUTH_SERVICE } from '@app/contracts/constants/auth-service.constant';
import { AuthController } from './auth.controller';
import { FacebookController } from './socials/controllers/facebook.controller';
import { GithubController } from './socials/controllers/github.controller';
import { GoogleController } from './socials/controllers/google.controller';
import { LinkedInController } from './socials/controllers/linkedin.controller';
import { FacebookStrategy } from './socials/strategies/facebook.strategy';
import { GitHubStrategy } from './socials/strategies/github.strategy';
import { GoogleStrategy } from './socials/strategies/google.strategy';
import { LinkedInStrategy } from './socials/strategies/linkedin.strategy';

@Module({
  imports: [
    // The gateway does not implement auth logic itself; it forwards requests
    // to the internal auth microservice over Nest TCP transport.
    ClientsModule.registerAsync([
      {
        name: AUTH_SERVICE.NAME,
        useFactory: (configService: ConfigService) => ({
          transport: Transport.TCP,
          options: {
            host: configService.get<string>('services.auth.host'),
            port: configService.get<number>('services.auth.port'),
          },
        }),
        inject: [ConfigService],
      },
    ]),
    // Shared rate limiting is applied to login / signup style routes.
    ThrottlerModule,
    // Passport powers the social OAuth guards and strategies in this module.
    PassportModule,
    JwtModule,
    TypeOrmModule.forFeature([User]),
  ],
  controllers: [
    AuthController,
    GoogleController,
    LinkedInController,
    GithubController,
    FacebookController,
  ],
  providers: [
    GoogleStrategy,
    LinkedInStrategy,
    GitHubStrategy,
    FacebookStrategy,
  ],
})
export class AuthModule {}
