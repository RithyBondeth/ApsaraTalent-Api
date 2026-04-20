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
import { CoreResponseDTO, PaginationDTO } from '@app/contracts/dtos/shared';
import {
  UserResponseDTO,
  CompanyResponseDTO,
  EmployeeResponseDTO,
  CareerScopesResponseDTO,
  FavoriteCountResponseDTO,
  EmployeeCompanyFavoriteDTO,
  EmployeeCompanyFavoriteWithFavoriteIdDTO,
  CompanyEmployeeFavoriteDTO,
  CompanyEmployeeFavoriteWithFavoriteIdDTO,
  EmployeeFavoriteLookupDTO,
  CompanyFavoriteLookupDTO,
  UpdatePushNotificationTokenBodyDTO,
} from '@app/contracts/dtos/user';
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
    @Query() paginationDTO: PaginationDTO,
  ): Promise<UserResponseDTO[]> {
    return rpcCall<UserResponseDTO[]>(
      this.userClient,
      USER_SERVICE.ACTIONS.FIND_ALL,
      paginationDTO,
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
  async getCurrentUser(@User() user: AuthUser): Promise<UserResponseDTO> {
    return rpcCall<UserResponseDTO>(
      this.userClient,
      USER_SERVICE.ACTIONS.GET_CURRENT_USER,
      {
        userID: user.id,
      },
    );
  }

  @Post('push-token')
  async updatePushNotificationToken(
    @Req() req: any,
    @Body() body: UpdatePushNotificationTokenBodyDTO,
  ): Promise<CoreResponseDTO> {
    return rpcCall<CoreResponseDTO>(
      this.userClient,
      USER_SERVICE.ACTIONS.UPDATE_PUSH_TOKEN,
      {
        userId: req.user.id,
        token: body?.token ?? null,
      },
    );
  }

  @Post('employee/:eid/favorite/company/:cid')
  async employeeFavoriteCompany(
    @Param() employeeCompanyFavoriteDTO: EmployeeCompanyFavoriteDTO,
    @Req() req?: any,
  ): Promise<CoreResponseDTO> {
    await this.assertEmployeeAccess(
      req?.user?.id,
      employeeCompanyFavoriteDTO.eid,
    );
    return rpcCall<CoreResponseDTO>(
      this.userClient,
      USER_SERVICE.ACTIONS.ADD_COMPANY_TO_FAVORITE,
      employeeCompanyFavoriteDTO,
    );
  }

  @Post('employee/:eid/unfavorite/:favoriteId/company/:cid')
  async employeeUnfavoriteCompany(
    @Param()
    companyEmployeeFavoriteDTO: EmployeeCompanyFavoriteWithFavoriteIdDTO,
    @Req() req?: any,
  ): Promise<CoreResponseDTO> {
    await this.assertEmployeeAccess(
      req?.user?.id,
      companyEmployeeFavoriteDTO.eid,
    );
    return rpcCall<CoreResponseDTO>(
      this.userClient,
      USER_SERVICE.ACTIONS.REMOVE_COMPANY_FROM_FAVORITE,
      companyEmployeeFavoriteDTO,
    );
  }

  @Post('company/:cid/favorite/employee/:eid')
  async companyFavoriteEmployee(
    @Param() companyEmployeeFavoriteDTO: CompanyEmployeeFavoriteDTO,
    @Req() req?: any,
  ): Promise<CoreResponseDTO> {
    await this.assertCompanyAccess(
      req?.user?.id,
      companyEmployeeFavoriteDTO.cid,
    );
    return rpcCall<CoreResponseDTO>(
      this.userClient,
      USER_SERVICE.ACTIONS.ADD_EMPLOYEE_TO_FAVORITE,
      companyEmployeeFavoriteDTO,
    );
  }

  @Post('company/:cid/unfavorite/:favoriteId/employee/:eid')
  async companyUnfavoriteEmployee(
    @Param()
    companyEmployeeFavoriteDTO: CompanyEmployeeFavoriteWithFavoriteIdDTO,
    @Req() req?: any,
  ): Promise<CoreResponseDTO> {
    await this.assertCompanyAccess(
      req?.user?.id,
      companyEmployeeFavoriteDTO.cid,
    );
    return rpcCall<CoreResponseDTO>(
      this.userClient,
      USER_SERVICE.ACTIONS.REMOVE_EMPLOYEE_FROM_FAVORITE,
      companyEmployeeFavoriteDTO,
    );
  }

  @Get('employee/all-favorites/:eid')
  async findAllEmployeeFavorite(
    @Param() employeeFavoriteLookupDTO: EmployeeFavoriteLookupDTO,
    @Req() req?: any,
  ): Promise<CompanyResponseDTO[]> {
    await this.assertEmployeeAccess(
      req?.user?.id,
      employeeFavoriteLookupDTO.eid,
    );
    return rpcCall<CompanyResponseDTO[]>(
      this.userClient,
      USER_SERVICE.ACTIONS.FIND_ALL_EMPLOYEE_FAVORITE,
      employeeFavoriteLookupDTO,
    );
  }

  @Get('company/all-favorites/:cid')
  async findAllCompanyFavorite(
    @Param() companyFavoriteLookupDTO: CompanyFavoriteLookupDTO,
    @Req() req?: any,
  ): Promise<EmployeeResponseDTO[]> {
    await this.assertCompanyAccess(req?.user?.id, companyFavoriteLookupDTO.cid);
    return rpcCall<EmployeeResponseDTO[]>(
      this.userClient,
      USER_SERVICE.ACTIONS.FIND_ALL_COMPANY_FAVORITE,
      companyFavoriteLookupDTO,
    );
  }

  @Get('employee/count-favorite/:eid')
  async countEmployeeFavorite(
    @Param() employeeFavoriteLookupDTO: EmployeeFavoriteLookupDTO,
    @Req() req?: any,
  ): Promise<FavoriteCountResponseDTO> {
    await this.assertEmployeeAccess(
      req?.user?.id,
      employeeFavoriteLookupDTO.eid,
    );
    return rpcCall<FavoriteCountResponseDTO>(
      this.userClient,
      USER_SERVICE.ACTIONS.COUNT_EMPLOYEE_FAVORITE,
      employeeFavoriteLookupDTO,
    );
  }

  @Get('company/count-favorite/:cid')
  async countCompanyFavorite(
    @Param() companyFavoriteLookupDTO: CompanyFavoriteLookupDTO,
    @Req() req?: any,
  ): Promise<FavoriteCountResponseDTO> {
    await this.assertCompanyAccess(req?.user?.id, companyFavoriteLookupDTO.cid);
    return rpcCall<FavoriteCountResponseDTO>(
      this.userClient,
      USER_SERVICE.ACTIONS.COUNT_COMPANY_FAVORITE,
      companyFavoriteLookupDTO,
    );
  }

  @Get('find-all-career-scopes')
  async findAllCareerScopes(): Promise<CareerScopesResponseDTO[]> {
    return rpcCall<CareerScopesResponseDTO[]>(
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
  ): Promise<CompanyResponseDTO[]> {
    await this.assertEmployeeAccess(req?.user?.id, employeeId);
    return rpcCall<CompanyResponseDTO[]>(
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
  ): Promise<EmployeeResponseDTO[]> {
    await this.assertCompanyAccess(req?.user?.id, companyId);
    return rpcCall<EmployeeResponseDTO[]>(
      this.userClient,
      USER_SERVICE.ACTIONS.GET_COMPANY_RECOMMENDATIONS,
      { companyId, limit: limit ? Number(limit) : 10 },
    );
  }
}
