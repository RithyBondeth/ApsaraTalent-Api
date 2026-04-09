import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import { buildPublicCallbackUrl } from './oauth-callback-url';

@Injectable()
export class FacebookAuthGuard extends AuthGuard('facebook') {
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
      callbackURL: buildPublicCallbackUrl(req, 'facebook'),
    };
  }

  handleRequest(err: any, user: any, info?: any) {
    if (err) throw err;
    if (!user) {
      throw new UnauthorizedException(
        info?.message || 'Facebook authentication was not completed',
      );
    }
    return user;
  }
}
