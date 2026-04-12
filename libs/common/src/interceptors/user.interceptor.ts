import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { JwtService } from '../jwt/jwt.service';

@Injectable()
export class UserInterceptor implements NestInterceptor {
  constructor(private readonly jwtService: JwtService) {}

  async intercept(context: ExecutionContext, handler: CallHandler) {
    const request = context.switchToHttp().getRequest();
    const token =
      request.cookies?.['auth-token'] ||
      request.headers?.authorization?.split('Bearer ')[1];

    if (token) {
      try {
        request.user = await this.jwtService.verifyToken(token);
      } catch {
        // Token invalid — leave request.user unset; guards will handle auth.
      }
    }

    return handler.handle();
  }
}
