import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { UserAccessService } from '../services/user-access.service';

@Injectable()
export class EmployeeDocumentAccessGuard implements CanActivate {
  constructor(private readonly userAccessService: UserAccessService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const profile = await this.userAccessService.getCurrentUserProfile(
      request.user?.id,
    );

    const isOwner =
      profile?.role === 'employee' &&
      profile.employee?.id === request.params?.employeeId;
    const isCompany = profile?.role === 'company';

    if (!isOwner && !isCompany) {
      throw new ForbiddenException(
        'You do not have permission to access this document.',
      );
    }

    return true;
  }
}
