import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { UserAccessService } from '../services/user-access.service';

@Injectable()
export class EmployeeProfileOwnerGuard implements CanActivate {
  constructor(private readonly userAccessService: UserAccessService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    await this.userAccessService.assertEmployeeAccess(
      request.user?.id,
      request.params?.employeeId,
    );

    return true;
  }
}
