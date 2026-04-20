import { Controller, Get, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { USER_SERVICE } from '@app/contracts/constants/service-actions/user-service.constant';
import { IPublicUserController } from '@app/contracts/interfaces/controller/public-user-controller.interface';
import { LandingStatsResponseDTO } from '@app/contracts/dtos/user';
import { rpcCall } from '../../utils/rpc-call';

@Controller('public/user')
export class PublicUserController implements IPublicUserController {
  constructor(
    @Inject(USER_SERVICE.NAME) private readonly userClient: ClientProxy,
  ) {}

  @Get('landing-stats')
  async getLandingStats(): Promise<LandingStatsResponseDTO> {
    const [users, companies, employees] = await Promise.all([
      rpcCall<{ totalUsers: number }>(
        this.userClient,
        USER_SERVICE.ACTIONS.COUNT_ALL_USERS,
        {},
      ),
      rpcCall<{ totalCompanies: number }>(
        this.userClient,
        USER_SERVICE.ACTIONS.COUNT_ALL_COMPANY,
        {},
      ),
      rpcCall<{ totalEmployees: number }>(
        this.userClient,
        USER_SERVICE.ACTIONS.COUNT_ALL_EMPLOYEE,
        {},
      ),
    ]);

    return new LandingStatsResponseDTO({
      users: users?.totalUsers ?? 0,
      companies: companies?.totalCompanies ?? 0,
      employees: employees?.totalEmployees ?? 0,
    });
  }
}
