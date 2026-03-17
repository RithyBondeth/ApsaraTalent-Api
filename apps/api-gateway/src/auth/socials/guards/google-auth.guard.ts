<<<<<<< HEAD
import { Injectable } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";

@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {}
=======
import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {
  canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest();

    // Save remember query
    if (req.query.remember)
      req.session.remember = req.query.remember === 'true';

    return super.canActivate(context);
  }

  // Allow OAuth to continue
  handleRequest = (err: any, user: any) => user;
}
>>>>>>> c4eaba4638ff660126b81b33f459ea47796036af
