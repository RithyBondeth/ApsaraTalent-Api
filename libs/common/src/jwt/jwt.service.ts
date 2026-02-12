import { Injectable } from '@nestjs/common';
import { JwtService as NestJwtService } from '@nestjs/jwt';
import { IPayload } from './interfaces/payload.interface';
import { ConfigService } from '@nestjs/config';
import { StringValue } from 'ms';
@Injectable()
export class JwtService {
  constructor(
    private readonly jwtService: NestJwtService,
    private readonly configService: ConfigService,
  ) {}

  async generateToken(payload: IPayload): Promise<string> {
    const token = await this.jwtService.signAsync(payload);
    return token;
  }

  async generateRefreshToken(userId: string): Promise<string> {
    const refreshToken = await this.jwtService.signAsync(
      { id: userId, type: 'refresh' },
      { expiresIn: this.configService.get<StringValue>('jwt.refreshExpiresIn') },
    );
    return refreshToken;
  }

  async generateEmailVerificationToken(email: string): Promise<string> {
    const token = await this.jwtService.signAsync(
      { email, type: 'email-verification' },
      { expiresIn: this.configService.get<StringValue>('jwt.emailExpiresIn') },
    );
    return token;
  }

  async verifyToken(token: string): Promise<any> {
    try {
      return this.jwtService.verifyAsync(token);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(errorMessage);
      throw new Error(errorMessage);
    }
  }

  async verifyRefreshToken(token: string): Promise<any> {
    try {
      const decoded = await this.jwtService.verifyAsync(token);
      if (decoded.type !== 'refresh') throw new Error('Invalid token type');
      return decoded;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(errorMessage);
      throw new Error(errorMessage);
    }
  }

  async verifyEmailToken(token: string): Promise<any> {
    try {
      const decoded = await this.jwtService.verifyAsync(token);
      if (decoded.type !== 'email-verification')
        throw new Error('Invalid token type');
      return decoded;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(errorMessage);
      throw new Error(errorMessage);
    }
  }

  decodeToken(token: string): IPayload {
    const decode = this.jwtService.decode(token);
    if (!decode) throw new Error('Failed to decode token');
    return decode as IPayload;
  }
}
