import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { USER_SERVICE } from '@app/contracts/constants/service-actions/user-service.constant';
import { UserResponseDTO } from '@app/contracts';
import { IJobAccessService } from '@app/contracts/interfaces/service';
import { rpcCall } from '../../utils/rpc-call';

@Injectable()
export class JobAccessService implements IJobAccessService {
  constructor(
    @Inject(USER_SERVICE.NAME) private readonly userClient: ClientProxy,
  ) {}

  async getCurrentUserProfile(userId: string): Promise<UserResponseDTO> {
    return rpcCall(this.userClient, USER_SERVICE.ACTIONS.GET_CURRENT_USER, {
      userId,
    });
  }

  async assertEmployeeAccess(
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

  async assertCompanyAccess(
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

  async assertMatchParticipantAccess(
    requestUserId: string,
    eid: string,
    cid: string,
  ): Promise<void> {
    if (!requestUserId) {
      throw new ForbiddenException('Unauthorized request.');
    }

    const profile = await this.getCurrentUserProfile(requestUserId);

    if (profile?.role === 'employee' && profile?.employee?.id === eid) return;
    if (profile?.role === 'company' && profile?.company?.id === cid) return;

    throw new ForbiddenException(
      'You do not have permission to access this resource.',
    );
  }
}
