import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule as NestJwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthGuard } from '../guards/auth.guard';
import { User } from '../database/entities/user.entity';
import { jwtConfig } from './config/jwt.config';
import { JwtService } from './jwt.service';

@Module({
  imports: [
    NestJwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: jwtConfig,
    }),
    TypeOrmModule.forFeature([User]),
  ],
  providers: [JwtService, AuthGuard],
  exports: [JwtService, AuthGuard, TypeOrmModule],
})
export class JwtModule {}
