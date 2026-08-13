import { AuthUser, User } from '@app/common/decorators/user.decorator';
import { AuthGuard } from '@app/common/guards/auth.guard';
import { IUserController } from '@app/contracts/interfaces/controller/user-controllers/user-controller.interface';
import {
  Body,
  Controller,
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
import { PaginationDTO } from '@app/contracts/dtos/shared';
import {
  UserResponseDTO,
  CompanyResponseDTO,
  EmployeeResponseDTO,
  CareerScopesResponseDTO,
  EmployeeCompanyFavoriteDTO,
  EmployeeCompanyFavoriteWithFavoriteIdDTO,
  CompanyEmployeeFavoriteDTO,
  CompanyEmployeeFavoriteWithFavoriteIdDTO,
  EmployeeFavoriteLookupDTO,
  CompanyFavoriteLookupDTO,
  UpdatePushNotificationTokenBodyDTO,
  UpdatePushNotificationTokenResponseDTO,
  EmployeeFavoriteCompanyResponseDTO,
  EmployeeUnfavoriteCompanyResponseDTO,
  CompanyFavoriteEmployeeResponseDTO,
  CompanyUnfavoriteEmployeeResponseDTO,
  EmployeeFavoritesListItemDTO,
  CompanyFavoritesListItemDTO,
  FavoriteCountResponseDTO,
} from '@app/contracts/dtos/user';
import { rpcCall } from '../../utils/rpc-call';
import { UserAccessService } from '../services/user-access.service';

/**
 * Recommendation feeds score a candidate pool across several queries, so a
 * cold cache costs one round-trip to Postgres per query. That is fine when the
 * database is nearby, but this deployment talks to a region where a bare
 * `SELECT 1` measures 275-850ms, which puts the uncached path around 15s —
 * past the 10s default and into a 504 the client then retries.
 *
 * The work itself completes; only the budget was wrong. Caching makes every
 * later call fast, so this raised ceiling only ever applies to the first
 * request for a given user. Put it back to the default once the database is
 * closer to the API.
 */
const RECOMMENDATIONS_TIMEOUT_MS = 30_000;

@Controller('user')
@UseGuards(AuthGuard)
export class UserController implements IUserController {
  constructor(
    @Inject(USER_SERVICE.NAME) private readonly userClient: ClientProxy,
    private readonly userAccessService: UserAccessService,
  ) {}

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
        userId: user.id,
      },
    );
  }

  @Post('push-token')
  async updatePushNotificationToken(
    @Req() req: any,
    @Body() body: UpdatePushNotificationTokenBodyDTO,
  ): Promise<UpdatePushNotificationTokenResponseDTO> {
    return rpcCall<UpdatePushNotificationTokenResponseDTO>(
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
  ): Promise<EmployeeFavoriteCompanyResponseDTO> {
    await this.userAccessService.assertEmployeeAccess(
      req?.user?.id,
      employeeCompanyFavoriteDTO.eid,
    );
    return rpcCall<EmployeeFavoriteCompanyResponseDTO>(
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
  ): Promise<EmployeeUnfavoriteCompanyResponseDTO> {
    await this.userAccessService.assertEmployeeAccess(
      req?.user?.id,
      companyEmployeeFavoriteDTO.eid,
    );
    return rpcCall<EmployeeUnfavoriteCompanyResponseDTO>(
      this.userClient,
      USER_SERVICE.ACTIONS.REMOVE_COMPANY_FROM_FAVORITE,
      companyEmployeeFavoriteDTO,
    );
  }

  @Post('company/:cid/favorite/employee/:eid')
  async companyFavoriteEmployee(
    @Param() companyEmployeeFavoriteDTO: CompanyEmployeeFavoriteDTO,
    @Req() req?: any,
  ): Promise<CompanyFavoriteEmployeeResponseDTO> {
    await this.userAccessService.assertCompanyAccess(
      req?.user?.id,
      companyEmployeeFavoriteDTO.cid,
    );
    return rpcCall<CompanyFavoriteEmployeeResponseDTO>(
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
  ): Promise<CompanyUnfavoriteEmployeeResponseDTO> {
    await this.userAccessService.assertCompanyAccess(
      req?.user?.id,
      companyEmployeeFavoriteDTO.cid,
    );
    return rpcCall<CompanyUnfavoriteEmployeeResponseDTO>(
      this.userClient,
      USER_SERVICE.ACTIONS.REMOVE_EMPLOYEE_FROM_FAVORITE,
      companyEmployeeFavoriteDTO,
    );
  }

  @Get('employee/all-favorites/:eid')
  async findAllEmployeeFavorite(
    @Param() employeeFavoriteLookupDTO: EmployeeFavoriteLookupDTO,
    @Req() req?: any,
  ): Promise<EmployeeFavoritesListItemDTO[]> {
    await this.userAccessService.assertEmployeeAccess(
      req?.user?.id,
      employeeFavoriteLookupDTO.eid,
    );
    return rpcCall<EmployeeFavoritesListItemDTO[]>(
      this.userClient,
      USER_SERVICE.ACTIONS.FIND_ALL_EMPLOYEE_FAVORITE,
      employeeFavoriteLookupDTO,
    );
  }

  @Get('company/all-favorites/:cid')
  async findAllCompanyFavorite(
    @Param() companyFavoriteLookupDTO: CompanyFavoriteLookupDTO,
    @Req() req?: any,
  ): Promise<CompanyFavoritesListItemDTO[]> {
    await this.userAccessService.assertCompanyAccess(
      req?.user?.id,
      companyFavoriteLookupDTO.cid,
    );
    return rpcCall<CompanyFavoritesListItemDTO[]>(
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
    await this.userAccessService.assertEmployeeAccess(
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
    await this.userAccessService.assertCompanyAccess(
      req?.user?.id,
      companyFavoriteLookupDTO.cid,
    );
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
    await this.userAccessService.assertEmployeeAccess(
      req?.user?.id,
      employeeId,
    );
    return rpcCall<CompanyResponseDTO[]>(
      this.userClient,
      USER_SERVICE.ACTIONS.GET_EMPLOYEE_RECOMMENDATIONS,
      {
        employeeId,
        limit: limit ? Number(limit) : 10,
        requesterId: req?.user?.id,
      },
      RECOMMENDATIONS_TIMEOUT_MS,
    );
  }

  @Get('recommendation/company/:companyId')
  async getCompanyRecommendations(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Query('limit') limit?: number,
    @Req() req?: any,
  ): Promise<EmployeeResponseDTO[]> {
    await this.userAccessService.assertCompanyAccess(req?.user?.id, companyId);
    return rpcCall<EmployeeResponseDTO[]>(
      this.userClient,
      USER_SERVICE.ACTIONS.GET_COMPANY_RECOMMENDATIONS,
      {
        companyId,
        limit: limit ? Number(limit) : 10,
        requesterId: req?.user?.id,
      },
      RECOMMENDATIONS_TIMEOUT_MS,
    );
  }
}
