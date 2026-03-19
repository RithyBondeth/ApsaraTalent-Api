import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import { buildPublicCallbackUrl } from './oauth-callback-url';

@Injectable()
export class LinkedInAuthGuard extends AuthGuard('linkedin') {
  canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest<Request>();

    // Save remember query
    const remember = req.query.remember;
    if (typeof remember === 'string') {
      (req.session as any).remember = remember === 'true';
    }

    return super.canActivate(context);
  }

  getAuthenticateOptions(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest<Request>();
    return {
      callbackURL: buildPublicCallbackUrl(req, 'linkedin'),
    };
  }

  // Allow OAuth to continue
  handleRequest = (err: any, user: any) => user;
}
