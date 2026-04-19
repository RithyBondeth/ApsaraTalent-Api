import {
  IUserController,
  IUserRpcController,
} from '@app/contracts/interfaces/controller/user-controller.interface';
import { Controller, Inject } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { USER_SERVICE } from '@app/contracts/constants/service-actions/user-service.constant';
import {
  CountAllUsersResponseDTO,
  UserResponseDTO,
  CompanyResponseDTO,
  EmployeeResponseDTO,
  FavoriteCountResponseDTO,
  PaginationRequestDTO,
  UserIdDTO,
  UpdatePushNotificationTokenDTO,
  EmployeeCompanyFavoriteDTO,
  EmployeeCompanyFavoriteWithFavoriteIdDTO,
  CompanyEmployeeFavoriteDTO,
  CompanyEmployeeFavoriteWithFavoriteIdDTO,
  EmployeeFavoriteLookupDTO,
  CompanyFavoriteLookupDTO,
  EmployeeRecommendationsDTO,
  CompanyRecommendationsDTO,
} from '@app/contracts/dtos/user';

import {
  I_USER_SERVICE,
  IUserService,
} from '@app/contracts/interfaces/service/user-service.interface';
import { CoreResponseDTO } from '@app/contracts/dtos/shared';

@Controller()
export class UserController implements IUserRpcController {
  constructor(
    @Inject(I_USER_SERVICE) private readonly userService: IUserService,
  ) {}

  @MessagePattern(USER_SERVICE.ACTIONS.FIND_ALL)
  async findAllUsers(
    @Payload() payload: PaginationRequestDTO,
  ): Promise<UserResponseDTO[]> {
    return this.userService.findAllUsers(payload);
  }

  @MessagePattern(USER_SERVICE.ACTIONS.COUNT_ALL_USERS)
  async countAllUsers(): Promise<CountAllUsersResponseDTO> {
    return this.userService.countAllUsers();
  }

  @MessagePattern(USER_SERVICE.ACTIONS.FIND_ONE_BY_ID)
  async findOneUserById(
    @Payload() payload: UserIdDTO,
  ): Promise<UserResponseDTO> {
    return this.userService.findOneUserByID(payload);
  }

  @MessagePattern(USER_SERVICE.ACTIONS.GET_CURRENT_USER)
  async getCurrentUser(
    @Payload() payload: UserIdDTO,
  ): Promise<UserResponseDTO> {
    return this.userService.findOneUserByID(payload);
  }

  @MessagePattern(USER_SERVICE.ACTIONS.UPDATE_PUSH_TOKEN)
  async updatePushNotificationToken(
    @Payload() payload: UpdatePushNotificationTokenDTO,
  ): Promise<CoreResponseDTO> {
    return this.userService.updatePushNotificationToken(payload);
  }

  @MessagePattern(USER_SERVICE.ACTIONS.ADD_COMPANY_TO_FAVORITE)
  async employeeFavoriteCompany(
    @Payload() payload: EmployeeCompanyFavoriteDTO,
  ): Promise<CoreResponseDTO> {
    return this.userService.employeeFavoriteCompany(payload);
  }

  @MessagePattern(USER_SERVICE.ACTIONS.REMOVE_COMPANY_FROM_FAVORITE)
  async employeeUnfavoriteCompany(
    @Payload() payload: EmployeeCompanyFavoriteWithFavoriteIdDTO,
  ): Promise<CoreResponseDTO> {
    return this.userService.employeeUnfavoriteCompany(payload);
  }

  @MessagePattern(USER_SERVICE.ACTIONS.REMOVE_EMPLOYEE_FROM_FAVORITE)
  async companyUnfavoriteEmployee(
    @Payload() payload: CompanyEmployeeFavoriteWithFavoriteIdDTO,
  ): Promise<CoreResponseDTO> {
    return this.userService.companyUnfavoriteEmployee(payload);
  }

  @MessagePattern(USER_SERVICE.ACTIONS.ADD_EMPLOYEE_TO_FAVORITE)
  async companyFavoriteEmployee(
    @Payload() payload: CompanyEmployeeFavoriteDTO,
  ): Promise<CoreResponseDTO> {
    return this.userService.companyFavoriteEmployee(payload);
  }

  @MessagePattern(USER_SERVICE.ACTIONS.FIND_ALL_EMPLOYEE_FAVORITE)
  async findAllEmployeeFavorite(
    @Payload() payload: EmployeeFavoriteLookupDTO,
  ): Promise<CompanyResponseDTO[]> {
    return this.userService.findAllEmployeeFavorites(payload);
  }

  @MessagePattern(USER_SERVICE.ACTIONS.FIND_ALL_COMPANY_FAVORITE)
  async findAllCompanyFavorite(
    @Payload() payload: CompanyFavoriteLookupDTO,
  ): Promise<EmployeeResponseDTO[]> {
    return this.userService.findAllCompanyFavorites(payload);
  }

  @MessagePattern(USER_SERVICE.ACTIONS.COUNT_COMPANY_FAVORITE)
  async countCompanyFavorite(
    @Payload() payload: CompanyFavoriteLookupDTO,
  ): Promise<FavoriteCountResponseDTO> {
    return this.userService.countCompanyFavorite(payload);
  }

  @MessagePattern(USER_SERVICE.ACTIONS.COUNT_EMPLOYEE_FAVORITE)
  async countEmployeeFavorite(
    @Payload() payload: EmployeeFavoriteLookupDTO,
  ): Promise<FavoriteCountResponseDTO> {
    return this.userService.countEmployeeFavorite(payload);
  }

  @MessagePattern(USER_SERVICE.ACTIONS.FIND_ALL_CAREER_SCOPES)
  async findAllCareerScopes(): Promise<any[]> {
    return this.userService.findAllCareerScopes();
  }

  @MessagePattern(USER_SERVICE.ACTIONS.CLEAR_CURRENT_USER_CACHE)
  async clearUserCache(@Payload() payload: UserIdDTO): Promise<void> {
    return this.userService.clearCurrentUserCache(payload);
  }

  @MessagePattern(USER_SERVICE.ACTIONS.GET_EMPLOYEE_RECOMMENDATIONS)
  async getEmployeeRecommendations(
    @Payload() payload: EmployeeRecommendationsDTO,
  ): Promise<CompanyResponseDTO[]> {
    return this.userService.getEmployeeRecommendations(payload);
  }

  @MessagePattern(USER_SERVICE.ACTIONS.GET_COMPANY_RECOMMENDATIONS)
  async getCompanyRecommendations(
    @Payload() payload: CompanyRecommendationsDTO,
  ): Promise<EmployeeResponseDTO[]> {
    return this.userService.getCompanyRecommendations(payload);
  }
}
