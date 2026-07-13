import { JwtModule, ThrottlerModule } from '@app/common';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { PassportModule } from '@nestjs/passport';
import { AUTH_SERVICE } from '@app/contracts/constants/service-actions/auth-service.constant';
import { AuthController } from './basic/controllers/auth.controller';
import { FacebookController } from './socials/controllers/facebook.controller';
import { GithubController } from './socials/controllers/github.controller';
import { GoogleController } from './socials/controllers/google.controller';
import { LinkedInController } from './socials/controllers/linkedin.controller';
import { FacebookStrategy } from './socials/strategies/facebook.strategy';
import { GitHubStrategy } from './socials/strategies/github.strategy';
import { GoogleStrategy } from './socials/strategies/google.strategy';
import { LinkedInStrategy } from './socials/strategies/linkedin.strategy';
import { ResumeParseService } from './services/resume-parse.service';
import { IceServersService } from './services/ice-servers.service';
import { SocialAuthService } from './services/social-auth.service';

@Module({
  imports: [
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
    ThrottlerModule,
    PassportModule,
    JwtModule,
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
    ResumeParseService,
    IceServersService,
    SocialAuthService,
  ],
})
export class AuthModule {}
