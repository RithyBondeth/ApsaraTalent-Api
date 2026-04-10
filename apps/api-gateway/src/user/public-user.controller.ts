import { Controller, Get, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { USER_SERVICE } from '@app/contracts/constants/service-actions/user-service.constant';
import { IPublicUserController } from '@app/contracts/interfaces/public-user-controller.interface';

@Controller('public/user')
export class PublicUserController implements IPublicUserController {
  constructor(
    @Inject(USER_SERVICE.NAME) private readonly userClient: ClientProxy,
  ) {}

  @Get('landing-stats')
  async getLandingStats() {
    const [users, companies, employees] = await Promise.all([
      firstValueFrom(
        this.userClient.send<{ totalUsers: number }>(
          USER_SERVICE.ACTIONS.COUNT_ALL_USERS,
          {},
        ),
      ),
      firstValueFrom(
        this.userClient.send<{ totalCompanies: number }>(
          USER_SERVICE.ACTIONS.COUNT_ALL_COMPANY,
          {},
        ),
      ),
      firstValueFrom(
        this.userClient.send<{ totalEmployees: number }>(
          USER_SERVICE.ACTIONS.COUNT_ALL_EMPLOYEE,
          {},
        ),
      ),
    ]);

    return {
      users: users?.totalUsers ?? 0,
      companies: companies?.totalCompanies ?? 0,
      employees: employees?.totalEmployees ?? 0,
    };
  }
}
