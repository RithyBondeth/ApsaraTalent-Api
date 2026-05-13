import {
  CanActivate,
  ExecutionContext,
  Injectable,
  InternalServerErrorException,
  Optional,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';
import { Repository } from 'typeorm';
import { User } from '../database/entities/user.entity';
import { IPayload } from '../jwt/interfaces/payload.interface';
import { JwtService } from '../jwt/jwt.service';
import { RedisService } from '../redis/redis.service';

// Short TTL: users banned/deleted stop working within 2 minutes without DB hit on every request
const AUTH_CACHE_TTL_MS = 2 * 60 * 1000;

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    @Optional() private readonly redisService?: RedisService,
  ) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const token =
      request.cookies?.['auth-token'] ||
      request.headers?.authorization?.split('Bearer ')[1];

    if (!token) {
      throw new UnauthorizedException('No token provided');
    }

    let payload: IPayload;
    try {
      payload = await this.jwtService.verifyToken(token);
    } catch (error) {
      if (error instanceof TokenExpiredError) {
        throw new UnauthorizedException('Token has expired');
      }
      if (error instanceof JsonWebTokenError) {
        throw new UnauthorizedException('Invalid token');
      }
      throw new UnauthorizedException('Token verification failed');
    }

    const cacheKey = `apsaratalent:auth:session:${payload.id}`;

    if (this.redisService) {
      const cached = await this.redisService.get<User>(cacheKey);
      if (cached) {
        request.user = cached;
        return true;
      }
    }

    let user: User | null;
    try {
      user = await this.userRepository.findOne({ where: { id: payload.id } });
    } catch {
      throw new InternalServerErrorException(
        'Authentication service unavailable',
      );
    }

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (this.redisService) {
      await this.redisService.set(cacheKey, user, AUTH_CACHE_TTL_MS);
    }

    request.user = user;
    return true;
  }
}
