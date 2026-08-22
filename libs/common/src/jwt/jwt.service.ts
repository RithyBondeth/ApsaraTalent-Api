import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService as NestJwtService } from '@nestjs/jwt';
import { StringValue } from 'ms';
import { IPayload } from './interfaces/payload.interface';
@Injectable()
export class JwtService {
  private readonly logger = new Logger(JwtService.name);

  constructor(
    private readonly jwtService: NestJwtService,
    private readonly configService: ConfigService,
  ) {}

  async generateToken(payload: IPayload): Promise<string> {
    const token = await this.jwtService.signAsync({
      ...payload,
      type: 'access',
    });
    return token;
  }

  async generateRefreshToken(userId: string): Promise<string> {
    const refreshToken = await this.jwtService.signAsync(
      { id: userId, type: 'refresh' },
      {
        expiresIn: this.configService.get<StringValue>('jwt.refreshExpiresIn'),
      },
    );
    return refreshToken;
  }

  /**
   * Short-lived proof that a password login just succeeded for this user.
   *
   * The 2FA step used to take a bare `userId` from the request body, which
   * meant `verify-login` had no way to tell a caller who had just passed the
   * password check from one who had simply read an id out of a feed response.
   * The signature is what ties the two halves of the login together.
   *
   * Deliberately not an access token: it carries no role, cannot be used on
   * any authenticated route, and dies in minutes rather than hours.
   */
  async generateTwoFactorChallengeToken(userId: string): Promise<string> {
    return this.jwtService.signAsync(
      { id: userId, type: 'two-factor-challenge' },
      {
        expiresIn: this.configService.get<StringValue>(
          'jwt.twoFactorChallengeExpiresIn',
        ),
      },
    );
  }

  /** Returns the user id the challenge was issued for, or throws. */
  async verifyTwoFactorChallengeToken(token: string): Promise<string> {
    try {
      const decoded = await this.jwtService.verifyAsync(token);
      if (decoded.type !== 'two-factor-challenge')
        throw new Error('Invalid token type');
      if (typeof decoded.id !== 'string' || !decoded.id)
        throw new Error('Invalid token payload');
      return decoded.id;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(errorMessage);
      throw new Error(errorMessage);
    }
  }

  async verifyToken(token: string): Promise<any> {
    try {
      const decoded = await this.jwtService.verifyAsync(token);
      if (decoded.type !== 'access') throw new Error('Invalid token type');
      return decoded;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(errorMessage);
      throw new Error(errorMessage);
    }
  }

  async verifyRefreshToken(token: string): Promise<any> {
    try {
      const decoded = await this.jwtService.verifyAsync(token);
      if (decoded.type !== 'refresh') throw new Error('Invalid token type');
      return decoded;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(errorMessage);
      throw new Error(errorMessage);
    }
  }

  decodeToken(token: string): IPayload {
    const decode = this.jwtService.decode(token);
    if (!decode) throw new Error('Failed to decode token');
    return decode as IPayload;
  }
}
