import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule as NestJwtModule } from '@nestjs/jwt';
import { jwtConfig } from './config/jwt.config';
import { JwtService } from './jwt.service';

@Module({
  imports: [
    NestJwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: jwtConfig,
    }),
  ],
  providers: [JwtService],
  exports: [JwtService],
})
export class JwtModule {}
