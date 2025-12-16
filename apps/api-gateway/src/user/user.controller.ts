import { TUser, User } from '@app/common/decorators/user.decorator';
import { AuthGuard } from '@app/common/guards/auth.guard';
import { UserInterceptor } from '@app/common/interceptors/user.interceptor';
import { IUserController } from '@app/common/interfaces/user-controller.interface';
import {
  Controller,
  Get,
  Inject,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { USER_SERVICE } from 'utils/constants/user-service.constant';

@Controller('user')
@UseGuards(AuthGuard)
export class UserController implements IUserController {
  constructor(
    @Inject(USER_SERVICE.NAME) private readonly userClient: ClientProxy,
  ) {}

  @Get('all')
  async findAllUsers(): Promise<any> {
    return firstValueFrom(
      this.userClient.send(USER_SERVICE.ACTIONS.FIND_ALL, {}),
    );
  }

  @Get('one/:userId')
  async findOneUserById(
    @Param('userId', ParseUUIDPipe) userId: string,
  ): Promise<any> {
    const payload = { userId };
    return firstValueFrom(
      this.userClient.send(USER_SERVICE.ACTIONS.FIND_ONE_BY_ID, payload),
    );
  }

  @UseInterceptors(UserInterceptor)
  @Get('current-user')
  async getCurrentUser(@User() user: TUser): Promise<any> {
    const userID = user.id;
    const payload = { userID };
    return firstValueFrom(
      this.userClient.send(USER_SERVICE.ACTIONS.GET_CURRENT_USER, payload),
    );
  }

  @Post('employee/:eid/favorite/company/:cid')
  async employeeFavoriteCompany(
    @Param('eid', ParseUUIDPipe) eid: string,
    @Param('cid', ParseUUIDPipe) cid: string,
  ): Promise<any> {
    const payload = { eid, cid };
    return firstValueFrom(
      this.userClient.send(
        USER_SERVICE.ACTIONS.ADD_COMPANY_TO_FAVORITE,
        payload,
      ),
    );
  }

  @Post('employee/:eid/unfavorite/:favoriteId/company/:cid')
  async employeeUnfavoriteCompany(
    @Param('eid', ParseUUIDPipe) eid: string,
    @Param('cid', ParseUUIDPipe) cid: string,
    @Param('favoriteId', ParseUUIDPipe) favoriteId: string,
  ): Promise<any> {
    const payload = { eid, cid, favoriteId };
    return firstValueFrom(
      this.userClient.send(
        USER_SERVICE.ACTIONS.REMOVE_COMPANY_FROM_FAVORITE,
        payload,
      ),
    );
  }

  @Post('company/:cid/favorite/employee/:eid')
  async companyFavoriteEmployee(
    @Param('cid', ParseUUIDPipe) cid: string,
    @Param('eid', ParseUUIDPipe) eid: string,
  ): Promise<any> {
    const payload = { cid, eid };
    return firstValueFrom(
      this.userClient.send(
        USER_SERVICE.ACTIONS.ADD_EMPLOYEE_TO_FAVORITE,
        payload,
      ),
    );
  }

  @Post('company/:cid/unfavorite/:favoriteId/employee/:eid')
  async companyUnfavoriteEmployee(
    @Param('cid', ParseUUIDPipe) cid: string,
    @Param('eid', ParseUUIDPipe) eid: string,
    @Param('favoriteId', ParseUUIDPipe) favoriteId: string,
  ): Promise<any> {
    const payload = { cid, eid, favoriteId };
    return firstValueFrom(
      this.userClient.send(
        USER_SERVICE.ACTIONS.REMOVE_EMPLOYEE_FROM_FAVORITE,
        payload,
      ),
    );
  }

  @Get('employee/all-favorites/:eid')
  async findAllEmployeeFavorite(
    @Param('eid', ParseUUIDPipe) eid: string,
  ): Promise<any> {
    const payload = { eid };
    return firstValueFrom(
      this.userClient.send(
        USER_SERVICE.ACTIONS.FIND_ALL_EMPLOYEE_FAVORITE,
        payload,
      ),
    );
  }

  @Get('company/all-favorites/:cid')
  async findAllCompanyFavorite(
    @Param('cid', ParseUUIDPipe) cid: string,
  ): Promise<any> {
    const payload = { cid };
    return firstValueFrom(
      this.userClient.send(
        USER_SERVICE.ACTIONS.FIND_ALL_COMPANY_FAVORITE,
        payload,
      ),
    );
  }

  @Get('employee/count-favorite/:eid')
  async countEmployeeFavorite(
    @Param('eid', ParseUUIDPipe) eid: string,
  ): Promise<any> {
    const payload = { eid };
    return firstValueFrom(
      this.userClient.send(
        USER_SERVICE.ACTIONS.COUNT_EMPLOYEE_FAVORITE,
        payload,
      ),
    );
  }

  @Get('company/count-favorite/:cid')
  async countCompanyFavorite(
    @Param('cid', ParseUUIDPipe) cid: string,
  ): Promise<any> {
    const payload = { cid };
    return firstValueFrom(
      this.userClient.send(
        USER_SERVICE.ACTIONS.COUNT_COMPANY_FAVORITE,
        payload,
      ),
    );
  }

  @Get('find-all-career-scopes')
  async findAllCareerScopes(): Promise<any> {
    return firstValueFrom(
      this.userClient.send(USER_SERVICE.ACTIONS.FIND_ALL_CAREER_SCOPES, {}),
    );
  }
}
