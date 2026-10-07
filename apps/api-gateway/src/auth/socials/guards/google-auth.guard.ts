import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard, IAuthModuleOptions } from '@nestjs/passport';
import { Request } from 'express';
import { captureNativeOAuth } from '../shared/native-oauth';
import { buildPublicCallbackUrl } from '../shared/oauth-callback-url.util';

@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {
  canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest<Request>();

    captureNativeOAuth(req);
    const remember = req.query.remember;
    if (typeof remember === 'string') {
      (req.session as any).remember = remember === 'true';
    }

    return super.canActivate(context);
  }

  getAuthenticateOptions(context: ExecutionContext): IAuthModuleOptions {
    const req = context.switchToHttp().getRequest<Request>();
    return {
      state: (req.session as any).nativeOAuth?.state,
      callbackURL: buildPublicCallbackUrl(req, 'google'),
    };
  }

  handleRequest(err: any, user: any, info?: any): any {
    if (err) throw err;
    if (!user) {
      throw new UnauthorizedException(
        info?.message || 'Google authentication was not completed',
      );
    }
    return user;
  }
}
