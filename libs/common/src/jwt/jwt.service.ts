import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService as NestJwtService } from '@nestjs/jwt';
import { StringValue } from 'ms';
import { IPayload } from './interfaces/payload.interface';
<<<<<<< HEAD
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtService {
    constructor(
        private readonly jwtService: NestJwtService,
        private readonly configService: ConfigService,
    ) {}
=======
@Injectable()
export class JwtService {
  constructor(
    private readonly jwtService: NestJwtService,
    private readonly configService: ConfigService,
  ) {}
>>>>>>> c4eaba4638ff660126b81b33f459ea47796036af

  async generateToken(payload: IPayload): Promise<string> {
    const token = await this.jwtService.signAsync(payload);
    return token;
  }

<<<<<<< HEAD
    async generateRefreshToken(userId: string): Promise<string> {
        const refreshToken = await this.jwtService.signAsync(
            { id: userId, type: 'refresh' },
            { expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRES') }
        );
        return refreshToken;
    }

    async generateEmailVerificationToken(email: string): Promise<string> {
        const token = await this.jwtService.signAsync(
            { email, type: 'email-verification' },
            { expiresIn: this.configService.get<string>('JWT_EMAIL_EXPIRES') }
        );
        return token;
    }

    async verifyToken(token: string): Promise<any> {
        try {
            return this.jwtService.verifyAsync(token);
        } catch (error) {
            console.error(error.message);
            throw new Error(error.message);
        }
    }

    async verifyRefreshToken(token: string): Promise<any> {
        try {
            const decoded = await this.jwtService.verifyAsync(token);
            if(decoded.type !== 'refresh') throw new Error('Invalid token type');
            return decoded;
        } catch (error) {
            console.error(error.message);
            throw new Error(error.message);
        }
    }

    async verifyEmailToken(token: string): Promise<any> {
        try {
            const decoded = await this.jwtService.verifyAsync(token);
            if(decoded.type !== 'email-verification') throw new Error('Invalid token type');
            return decoded;
        } catch (error) {
            console.error(error.message);
            throw new Error(error.message);
        }
    }

    decodeToken(token: string): IPayload {
        const decode = this.jwtService.decode(token);
        if(!decode) throw new Error('Failed to decode token');
        return decode as IPayload;
=======
  async generateRefreshToken(userId: string): Promise<string> {
    const refreshToken = await this.jwtService.signAsync(
      { id: userId, type: 'refresh' },
      {
        expiresIn: this.configService.get<StringValue>('jwt.refreshExpiresIn'),
      },
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
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      console.error(errorMessage);
      throw new Error(errorMessage);
>>>>>>> c4eaba4638ff660126b81b33f459ea47796036af
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
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
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
