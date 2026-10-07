import {
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import { RedisService } from '@app/common/redis/redis.service';
import { ISocialAuthResult } from '@app/contracts';

type Grant = {
  challenge: string;
  result: ISocialAuthResult;
  remember: boolean;
};

@Injectable()
export class MobileOAuthService {
  constructor(private readonly redis: RedisService) {}

  private key(code: string): string {
    return `oauth:mobile:${createHash('sha256').update(code).digest('hex')}`;
  }

  async issue(
    result: ISocialAuthResult,
    remember: boolean,
    challenge: string,
  ): Promise<string> {
    const code = randomBytes(32).toString('base64url');
    try {
      await this.redis.issueGrant(
        this.key(code),
        { result, remember, challenge },
        60_000,
      );
      return code;
    } catch {
      throw new ServiceUnavailableException(
        'Sign-in is temporarily unavailable. Please try again.',
      );
    }
  }

  async consume(code: string, verifier: string): Promise<Grant> {
    const challenge = createHash('sha256').update(verifier).digest('base64url');
    let grant: Grant | null;
    try {
      grant = await this.redis.consumeGrant<Grant>(this.key(code), challenge);
    } catch {
      throw new ServiceUnavailableException(
        'Sign-in is temporarily unavailable. Please try again.',
      );
    }
    if (!grant)
      throw new UnauthorizedException(
        'Sign-in code is invalid or expired. Start sign-in again.',
      );
    return grant;
  }
}
