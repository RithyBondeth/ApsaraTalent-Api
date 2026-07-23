import {
  CanActivate,
  ExecutionContext,
  Injectable,
  InternalServerErrorException,
  Optional,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as Sentry from '@sentry/nestjs';
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';
import { Repository } from 'typeorm';
import { User } from '../database/entities/user.entity';
import { IPayload } from '../jwt/interfaces/payload.interface';
import { JwtService } from '../jwt/jwt.service';
import { RedisService } from '../redis/redis.service';

// Short TTL: users banned/deleted stop working within 2 minutes without DB hit on every request
const AUTH_CACHE_TTL_MS = 2 * 60 * 1000;

/**
 * The only columns an authenticated request ever needs.
 *
 * Loading the whole row put the bcrypt hash, twoFactorSecret, otpCode,
 * resetPasswordToken and refreshToken on `request.user` and into Redis. Nothing
 * returned them, but a single `return req.user` in any future handler would
 * have leaked every credential on the account. Selecting explicitly makes that
 * mistake impossible rather than merely unlikely.
 */
const AUTH_USER_FIELDS = [
  'id',
  'role',
  'email',
  'profileCompleted',
  'isEmailVerified',
] as const satisfies readonly (keyof User)[];

export type AuthenticatedUser = Pick<User, (typeof AUTH_USER_FIELDS)[number]>;

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
      const cached = await this.redisService.get<AuthenticatedUser>(cacheKey);
      if (cached) {
        request.user = cached;
        this.identifyForSentry(cached);
        return true;
      }
    }

    let user: AuthenticatedUser | undefined;
    try {
      user = await this.userRepository.findOne({
        where: { id: payload.id },
        select: [...AUTH_USER_FIELDS],
      });
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
    this.identifyForSentry(user);
    return true;
  }

  // Attach the user to Sentry's request-isolated scope so errors show who was
  // affected. Only id + role — never email/name, to keep PII out of Sentry.
  private identifyForSentry(user: AuthenticatedUser): void {
    Sentry.setUser({ id: user.id, role: user.role });
  }
}
