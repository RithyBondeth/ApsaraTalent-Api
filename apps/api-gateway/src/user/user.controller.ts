import { AuthUser, User } from '@app/common/decorators/user.decorator';
import { AuthGuard } from '@app/common/guards/auth.guard';
import { IUserController } from '@app/contracts/interfaces/controller/user-controller.interface';
import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Inject,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { USER_SERVICE } from '@app/contracts/constants/service-actions/user-service.constant';
import { MessageResponse } from '@app/contracts/interfaces/domain/message-response.interface';
import { UserResponseDTO } from 'apps/user-service/src/dtos/user-response.dto';

@Controller('user')
@UseGuards(AuthGuard)
export class UserController implements IUserController {
  constructor(
    @Inject(USER_SERVICE.NAME) private readonly userClient: ClientProxy,
  ) {}

  private async getCurrentUserProfile(userId: string): Promise<any> {
    return firstValueFrom(
      this.userClient.send(USER_SERVICE.ACTIONS.GET_CURRENT_USER, {
        userID: userId,
      }),
    );
  }

  private async assertEmployeeAccess(
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

  private async assertCompanyAccess(
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

  @Get('all')
  async findAllUsers(): Promise<UserResponseDTO[]> {
    return firstValueFrom(
      this.userClient.send<UserResponseDTO[]>(USER_SERVICE.ACTIONS.FIND_ALL, {}),
    );
  }

  @Get('one/:userId')
  async findOneUserById(
    @Param('userId', ParseUUIDPipe) userId: string,
  ): Promise<UserResponseDTO> {
    const payload = { userId };
    return firstValueFrom(
      this.userClient.send<UserResponseDTO>(
        USER_SERVICE.ACTIONS.FIND_ONE_BY_ID,
        payload,
      ),
    );
  }

  @Get('current-user')
  async getCurrentUser(@User() user: AuthUser): Promise<any> {
    const userID = user.id;
    const payload = { userID };
    return firstValueFrom(
      this.userClient.send(USER_SERVICE.ACTIONS.GET_CURRENT_USER, payload),
    );
  }

  @Post('push-token')
  async updatePushNotificationToken(
    @Req() req,
    @Body() body: { token: string | null },
  ): Promise<any> {
    return firstValueFrom(
      this.userClient.send(USER_SERVICE.ACTIONS.UPDATE_PUSH_TOKEN, {
        userId: req.user.id,
        token: body?.token ?? null,
      }),
    );
  }

  @Post('employee/:eid/favorite/company/:cid')
  async employeeFavoriteCompany(
    @Param('eid', ParseUUIDPipe) eid: string,
    @Param('cid', ParseUUIDPipe) cid: string,
    @Req() req?: any,
  ): Promise<MessageResponse> {
    await this.assertEmployeeAccess(req?.user?.id, eid);
    const payload = { eid, cid };
    return firstValueFrom(
      this.userClient.send<MessageResponse>(
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
    @Req() req?: any,
  ): Promise<MessageResponse> {
    await this.assertEmployeeAccess(req?.user?.id, eid);
    const payload = { eid, cid, favoriteId };
    return firstValueFrom(
      this.userClient.send<MessageResponse>(
        USER_SERVICE.ACTIONS.REMOVE_COMPANY_FROM_FAVORITE,
        payload,
      ),
    );
  }

  @Post('company/:cid/favorite/employee/:eid')
  async companyFavoriteEmployee(
    @Param('cid', ParseUUIDPipe) cid: string,
    @Param('eid', ParseUUIDPipe) eid: string,
    @Req() req?: any,
  ): Promise<MessageResponse> {
    await this.assertCompanyAccess(req?.user?.id, cid);
    const payload = { cid, eid };
    return firstValueFrom(
      this.userClient.send<MessageResponse>(
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
    @Req() req?: any,
  ): Promise<MessageResponse> {
    await this.assertCompanyAccess(req?.user?.id, cid);
    const payload = { cid, eid, favoriteId };
    return firstValueFrom(
      this.userClient.send<MessageResponse>(
        USER_SERVICE.ACTIONS.REMOVE_EMPLOYEE_FROM_FAVORITE,
        payload,
      ),
    );
  }

  @Get('employee/all-favorites/:eid')
  async findAllEmployeeFavorite(
    @Param('eid', ParseUUIDPipe) eid: string,
    @Req() req?: any,
  ): Promise<any> {
    await this.assertEmployeeAccess(req?.user?.id, eid);
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
    @Req() req?: any,
  ): Promise<any> {
    await this.assertCompanyAccess(req?.user?.id, cid);
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
    @Req() req?: any,
  ): Promise<any> {
    await this.assertEmployeeAccess(req?.user?.id, eid);
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
    @Req() req?: any,
  ): Promise<any> {
    await this.assertCompanyAccess(req?.user?.id, cid);
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

  @Get('recommendation/employee/:employeeId')
  async getEmployeeRecommendations(
    @Param('employeeId', ParseUUIDPipe) employeeId: string,
    @Query('limit') limit?: number,
    @Req() req?: any,
  ): Promise<any> {
    await this.assertEmployeeAccess(req?.user?.id, employeeId);
    return firstValueFrom(
      this.userClient.send(USER_SERVICE.ACTIONS.GET_EMPLOYEE_RECOMMENDATIONS, {
        employeeId,
        limit: limit ? Number(limit) : 10,
      }),
    );
  }

  @Get('recommendation/company/:companyId')
  async getCompanyRecommendations(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Query('limit') limit?: number,
    @Req() req?: any,
  ): Promise<any> {
    await this.assertCompanyAccess(req?.user?.id, companyId);
    return firstValueFrom(
      this.userClient.send(USER_SERVICE.ACTIONS.GET_COMPANY_RECOMMENDATIONS, {
        companyId,
        limit: limit ? Number(limit) : 10,
      }),
    );
  }
}
