import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard, IAuthModuleOptions } from '@nestjs/passport';
import { Request } from 'express';
import { buildPublicCallbackUrl } from '../shared/oauth-callback-url.util';

@Injectable()
export class GithubAuthGuard extends AuthGuard('github') {
  canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest<Request>();

    const remember = req.query.remember;
    if (typeof remember === 'string') {
      (req.session as any).remember = remember === 'true';
    }

    return super.canActivate(context);
  }

  getAuthenticateOptions(context: ExecutionContext): IAuthModuleOptions {
    const req = context.switchToHttp().getRequest<Request>();
    return {
      callbackURL: buildPublicCallbackUrl(req, 'github'),
    };
  }

  handleRequest(err: any, user: any, info?: any): any {
    if (err) throw err;
    if (!user) {
      throw new UnauthorizedException(
        info?.message || 'Github authentication was not completed',
      );
    }
    return user;
  }
}
