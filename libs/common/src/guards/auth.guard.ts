import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
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
import { describeAccountStatus, isUserActive } from '../utils/user-status.util';

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
  // Account control. These three are the reason a suspension takes effect on
  // the next request rather than when the access token expires — see
  // `assertUsable` below.
  'status',
  'suspendedUntil',
  'statusReason',
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
        this.assertUsable(cached);
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

    this.assertUsable(user);

    request.user = user;
    this.identifyForSentry(user);
    return true;
  }

  /**
   * Turn away a suspended or banned account.
   *
   * Checked on both the cached and uncached paths, and *after* the cache write
   * on the uncached one, so a suspension imposed mid-session cannot be held off
   * by re-warming the cache. Admin actions also delete this key outright, which
   * is what makes the effect immediate rather than bounded by the 2-minute TTL.
   *
   * 403, not 401: the credentials are perfectly valid, so the client must not
   * treat this as an expired token and try to refresh — that loop would retry
   * forever against an account that is never coming back.
   */
  private assertUsable(user: AuthenticatedUser): void {
    if (isUserActive(user)) return;
    throw new ForbiddenException(describeAccountStatus(user));
  }

  // Attach the user to Sentry's request-isolated scope so errors show who was
  // affected. Only id + role — never email/name, to keep PII out of Sentry.
  private identifyForSentry(user: AuthenticatedUser): void {
    Sentry.setUser({ id: user.id, role: user.role });
  }
}
