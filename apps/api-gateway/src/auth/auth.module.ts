import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { AUTH_SERVICE } from 'utils/constants/auth-service.constant';
import { JwtModule, ThrottlerModule } from '@app/common';
import { GoogleController } from './socials/controllers/google.controller';
import { ConfigService } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { GoogleStrategy } from './socials/strategies/google.strategy';
import { LinkedInController } from './socials/controllers/linkedin.controller';
import { LinkedInStrategy } from './socials/strategies/linkedin.strategy';
import { GithubController } from './socials/controllers/github.controller';
import { GitHubStrategy } from './socials/strategies/github.strategy';
import { FacebookController } from './socials/controllers/facebook.controller';
import { FacebookStrategy } from './socials/strategies/facebook.strategy';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '@app/common/database/entities/user.entity';

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
    TypeOrmModule.forFeature([User])
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
