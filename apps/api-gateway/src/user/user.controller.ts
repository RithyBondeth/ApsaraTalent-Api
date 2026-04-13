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
import { USER_SERVICE } from '@app/contracts/constants/service-actions/user-service.constant';
import { MessageResponse } from '@app/contracts/interfaces/domain/message-response.interface';
import { UserResponseDTO } from '@app/contracts/dtos/user';
import { rpcCall } from '../utils/rpc-call';

@Controller('user')
@UseGuards(AuthGuard)
export class UserController implements IUserController {
  constructor(
    @Inject(USER_SERVICE.NAME) private readonly userClient: ClientProxy,
  ) {}

  private async getCurrentUserProfile(userId: string): Promise<any> {
    return rpcCall(this.userClient, USER_SERVICE.ACTIONS.GET_CURRENT_USER, {
      userID: userId,
    });
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
  async findAllUsers(
    @Query('skip') skip?: string,
    @Query('limit') limit?: string,
  ): Promise<UserResponseDTO[]> {
    return rpcCall<UserResponseDTO[]>(
      this.userClient,
      USER_SERVICE.ACTIONS.FIND_ALL,
      {
        skip: skip !== undefined ? Number(skip) : 0,
        limit: limit !== undefined ? Number(limit) : 20,
      },
    );
  }

  @Get('one/:userId')
  async findOneUserById(
    @Param('userId', ParseUUIDPipe) userId: string,
  ): Promise<UserResponseDTO> {
    return rpcCall<UserResponseDTO>(
      this.userClient,
      USER_SERVICE.ACTIONS.FIND_ONE_BY_ID,
      { userId },
    );
  }

  @Get('current-user')
  async getCurrentUser(@User() user: AuthUser): Promise<any> {
    return rpcCall(this.userClient, USER_SERVICE.ACTIONS.GET_CURRENT_USER, {
      userID: user.id,
    });
  }

  @Post('push-token')
  async updatePushNotificationToken(
    @Req() req,
    @Body() body: { token: string | null },
  ): Promise<any> {
    return rpcCall(this.userClient, USER_SERVICE.ACTIONS.UPDATE_PUSH_TOKEN, {
      userId: req.user.id,
      token: body?.token ?? null,
    });
  }

  @Post('employee/:eid/favorite/company/:cid')
  async employeeFavoriteCompany(
    @Param('eid', ParseUUIDPipe) eid: string,
    @Param('cid', ParseUUIDPipe) cid: string,
    @Req() req?: any,
  ): Promise<MessageResponse> {
    await this.assertEmployeeAccess(req?.user?.id, eid);
    return rpcCall<MessageResponse>(
      this.userClient,
      USER_SERVICE.ACTIONS.ADD_COMPANY_TO_FAVORITE,
      { eid, cid },
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
    return rpcCall<MessageResponse>(
      this.userClient,
      USER_SERVICE.ACTIONS.REMOVE_COMPANY_FROM_FAVORITE,
      { eid, cid, favoriteId },
    );
  }

  @Post('company/:cid/favorite/employee/:eid')
  async companyFavoriteEmployee(
    @Param('cid', ParseUUIDPipe) cid: string,
    @Param('eid', ParseUUIDPipe) eid: string,
    @Req() req?: any,
  ): Promise<MessageResponse> {
    await this.assertCompanyAccess(req?.user?.id, cid);
    return rpcCall<MessageResponse>(
      this.userClient,
      USER_SERVICE.ACTIONS.ADD_EMPLOYEE_TO_FAVORITE,
      { cid, eid },
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
    return rpcCall<MessageResponse>(
      this.userClient,
      USER_SERVICE.ACTIONS.REMOVE_EMPLOYEE_FROM_FAVORITE,
      { cid, eid, favoriteId },
    );
  }

  @Get('employee/all-favorites/:eid')
  async findAllEmployeeFavorite(
    @Param('eid', ParseUUIDPipe) eid: string,
    @Req() req?: any,
  ): Promise<any> {
    await this.assertEmployeeAccess(req?.user?.id, eid);
    return rpcCall(
      this.userClient,
      USER_SERVICE.ACTIONS.FIND_ALL_EMPLOYEE_FAVORITE,
      { eid },
    );
  }

  @Get('company/all-favorites/:cid')
  async findAllCompanyFavorite(
    @Param('cid', ParseUUIDPipe) cid: string,
    @Req() req?: any,
  ): Promise<any> {
    await this.assertCompanyAccess(req?.user?.id, cid);
    return rpcCall(
      this.userClient,
      USER_SERVICE.ACTIONS.FIND_ALL_COMPANY_FAVORITE,
      { cid },
    );
  }

  @Get('employee/count-favorite/:eid')
  async countEmployeeFavorite(
    @Param('eid', ParseUUIDPipe) eid: string,
    @Req() req?: any,
  ): Promise<any> {
    await this.assertEmployeeAccess(req?.user?.id, eid);
    return rpcCall(
      this.userClient,
      USER_SERVICE.ACTIONS.COUNT_EMPLOYEE_FAVORITE,
      { eid },
    );
  }

  @Get('company/count-favorite/:cid')
  async countCompanyFavorite(
    @Param('cid', ParseUUIDPipe) cid: string,
    @Req() req?: any,
  ): Promise<any> {
    await this.assertCompanyAccess(req?.user?.id, cid);
    return rpcCall(
      this.userClient,
      USER_SERVICE.ACTIONS.COUNT_COMPANY_FAVORITE,
      { cid },
    );
  }

  @Get('find-all-career-scopes')
  async findAllCareerScopes(): Promise<any> {
    return rpcCall(
      this.userClient,
      USER_SERVICE.ACTIONS.FIND_ALL_CAREER_SCOPES,
      {},
    );
  }

  @Get('recommendation/employee/:employeeId')
  async getEmployeeRecommendations(
    @Param('employeeId', ParseUUIDPipe) employeeId: string,
    @Query('limit') limit?: number,
    @Req() req?: any,
  ): Promise<any> {
    await this.assertEmployeeAccess(req?.user?.id, employeeId);
    return rpcCall(
      this.userClient,
      USER_SERVICE.ACTIONS.GET_EMPLOYEE_RECOMMENDATIONS,
      { employeeId, limit: limit ? Number(limit) : 10 },
    );
  }

  @Get('recommendation/company/:companyId')
  async getCompanyRecommendations(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Query('limit') limit?: number,
    @Req() req?: any,
  ): Promise<any> {
    await this.assertCompanyAccess(req?.user?.id, companyId);
    return rpcCall(
      this.userClient,
      USER_SERVICE.ACTIONS.GET_COMPANY_RECOMMENDATIONS,
      { companyId, limit: limit ? Number(limit) : 10 },
    );
  }
}
