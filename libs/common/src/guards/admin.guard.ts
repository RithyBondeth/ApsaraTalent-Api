import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { EUserRole } from '../database/enums/user-role.enum';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    if (request?.user?.role !== EUserRole.ADMIN) {
      throw new ForbiddenException('Administrator access is required');
    }
    return true;
  }
}
