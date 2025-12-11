import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {
    canActivate(context: ExecutionContext) {
        const req = context.switchToHttp().getRequest();
    
        // Save remember query
        if (req.query.remember) {
          req.session.remember = req.query.remember === 'true';
        }
    
        return super.canActivate(context);
      }
    
      // Allow OAuth to continue
      handleRequest(err, user) {
        return user;
      }
}
