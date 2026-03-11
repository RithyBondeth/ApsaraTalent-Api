import { JwtModule, ThrottlerModule } from '@app/common';
import { User } from '@app/common/database/entities/user.entity';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AUTH_SERVICE } from 'utils/constants/auth-service.constant';
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
