import { USER_SERVICE } from '@app/contracts/constants/service-actions/user-service.constant';
import { ForbiddenException } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { rpcCall } from '../../utils/rpc-call';
import { UserResponseDTO } from '@app/contracts';

export abstract class JobAccessBase {
  constructor(protected readonly userClient: ClientProxy) {}

  protected async getCurrentUserProfile(
    userId: string,
  ): Promise<UserResponseDTO> {
    return rpcCall(this.userClient, USER_SERVICE.ACTIONS.GET_CURRENT_USER, {
      userId: userId,
    });
  }

  protected async assertEmployeeAccess(
    requestUserId: string,
    employeeId: string,
  ): Promise<void> {
    if (!requestUserId) {
      throw new ForbiddenException('Unauthorized request.');
    }

    const profile = await this.getCurrentUserProfile(requestUserId);
    if (
      profile?.role !== 'employee' ||
      !profile?.employee?.id ||
      profile.employee.id !== employeeId
    ) {
      throw new ForbiddenException(
        'You do not have permission to access this employee resource.',
      );
    }
  }

  protected async assertCompanyAccess(
    requestUserId: string,
    companyId: string,
  ): Promise<void> {
    if (!requestUserId) {
      throw new ForbiddenException('Unauthorized request.');
    }

    const profile = await this.getCurrentUserProfile(requestUserId);
    if (
      profile?.role !== 'company' ||
      !profile?.company?.id ||
      profile.company.id !== companyId
    ) {
      throw new ForbiddenException(
        'You do not have permission to access this company resource.',
      );
    }
  }
}
