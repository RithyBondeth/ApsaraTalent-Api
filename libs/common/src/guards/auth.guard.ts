import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../database/entities/user.entity';
import { IPayload } from '../jwt/interfaces/payload.interface';
import { JwtService } from '../jwt/jwt.service';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    @InjectRepository(User) private readonly userRepository: Repository<User>,
  ) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const token =
      request.cookies?.['auth-token'] ||
      request.headers?.authorization?.split('Bearer ')[1];

    if (!token) {
      throw new UnauthorizedException("There's no token");
    }

    try {
      const payload: IPayload = await this.jwtService.verifyToken(token);
      const user = await this.userRepository.findOne({
        where: { id: payload.id },
      });

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      request.user = user;
      return true;
    } catch (error) {
      throw new UnauthorizedException(
        'Invalid Token or Insufficient permissions',
      );
    }
  }
}
