import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import { buildPublicCallbackUrl } from './oauth-callback-url';

@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {
  canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest<Request>();

    const remember = req.query.remember;
    if (typeof remember === 'string') {
      (req.session as any).remember = remember === 'true';
    }

    return super.canActivate(context);
  }

  getAuthenticateOptions(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest<Request>();
    return {
      callbackURL: buildPublicCallbackUrl(req, 'google'),
    };
  }

  handleRequest(err: any, user: any, info?: any) {
    if (err) throw err;
    if (!user) {
      throw new UnauthorizedException(
        info?.message || 'Google authentication was not completed',
      );
    }
    return user;
  }
}
