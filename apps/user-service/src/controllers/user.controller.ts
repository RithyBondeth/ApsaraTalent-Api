import { IUserRpcController } from '@app/contracts/interfaces/controller/user-controller.interface';
import { Controller, Inject } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { USER_SERVICE } from '@app/contracts/constants/service-actions/user-service.constant';
import {
  CountAllUsersResponseDTO,
  UserResponseDTO,
  CompanyResponseDTO,
  EmployeeResponseDTO,
  CareerScopesResponseDTO,
  FavoriteCountResponseDTO,
  UserIdDTO,
  UpdatePushNotificationTokenDTO,
  UpdatePushNotificationTokenResponseDTO,
  EmployeeCompanyFavoriteDTO,
  EmployeeCompanyFavoriteWithFavoriteIdDTO,
  EmployeeFavoriteCompanyResponseDTO,
  EmployeeUnfavoriteCompanyResponseDTO,
  CompanyEmployeeFavoriteDTO,
  CompanyEmployeeFavoriteWithFavoriteIdDTO,
  CompanyFavoriteEmployeeResponseDTO,
  CompanyUnfavoriteEmployeeResponseDTO,
  EmployeeFavoriteLookupDTO,
  CompanyFavoriteLookupDTO,
  EmployeeRecommendationsDTO,
  CompanyRecommendationsDTO,
  EmployeeFavoritesListItemDTO,
  CompanyFavoritesListItemDTO,
} from '@app/contracts/dtos/user';
import {
  I_USER_SERVICE,
  IUserService,
} from '@app/contracts/interfaces/service/user-service.interface';
import { PaginationDTO } from '@app/contracts/dtos/shared';

@Controller()
export class UserController implements IUserRpcController {
  constructor(
    @Inject(I_USER_SERVICE) private readonly userService: IUserService,
  ) {}

  @MessagePattern(USER_SERVICE.ACTIONS.FIND_ALL)
  async findAllUsers(
    @Payload() paginationDTO: PaginationDTO,
  ): Promise<UserResponseDTO[]> {
    return this.userService.findAllUsers(paginationDTO);
  }

  @MessagePattern(USER_SERVICE.ACTIONS.COUNT_ALL_USERS)
  async countAllUsers(): Promise<CountAllUsersResponseDTO> {
    return this.userService.countAllUsers();
  }

  @MessagePattern(USER_SERVICE.ACTIONS.FIND_ONE_BY_ID)
  async findOneUserById(
    @Payload() userIdDTO: UserIdDTO,
  ): Promise<UserResponseDTO> {
    return this.userService.findOneUserByID(userIdDTO);
  }

  @MessagePattern(USER_SERVICE.ACTIONS.GET_CURRENT_USER)
  async getCurrentUser(
    @Payload() userIdDTO: UserIdDTO,
  ): Promise<UserResponseDTO> {
    return this.userService.findOneUserByID(userIdDTO);
  }

  @MessagePattern(USER_SERVICE.ACTIONS.UPDATE_PUSH_TOKEN)
  async updatePushNotificationToken(
    @Payload() updatePushNotificationTokenDTO: UpdatePushNotificationTokenDTO,
  ): Promise<UpdatePushNotificationTokenResponseDTO> {
    return this.userService.updatePushNotificationToken(
      updatePushNotificationTokenDTO,
    );
  }

  @MessagePattern(USER_SERVICE.ACTIONS.ADD_COMPANY_TO_FAVORITE)
  async employeeFavoriteCompany(
    @Payload() employeeCompanyFavoriteDTO: EmployeeCompanyFavoriteDTO,
  ): Promise<EmployeeFavoriteCompanyResponseDTO> {
    return this.userService.employeeFavoriteCompany(employeeCompanyFavoriteDTO);
  }

  @MessagePattern(USER_SERVICE.ACTIONS.REMOVE_COMPANY_FROM_FAVORITE)
  async employeeUnfavoriteCompany(
    @Payload()
    employeeCompanyFavoriteWithFavoriteIdDTO: EmployeeCompanyFavoriteWithFavoriteIdDTO,
  ): Promise<EmployeeUnfavoriteCompanyResponseDTO> {
    return this.userService.employeeUnfavoriteCompany(
      employeeCompanyFavoriteWithFavoriteIdDTO,
    );
  }

  @MessagePattern(USER_SERVICE.ACTIONS.REMOVE_EMPLOYEE_FROM_FAVORITE)
  async companyUnfavoriteEmployee(
    @Payload()
    companyEmployeeFavoriteWithFavoriteIdDTO: CompanyEmployeeFavoriteWithFavoriteIdDTO,
  ): Promise<CompanyUnfavoriteEmployeeResponseDTO> {
    return this.userService.companyUnfavoriteEmployee(
      companyEmployeeFavoriteWithFavoriteIdDTO,
    );
  }

  @MessagePattern(USER_SERVICE.ACTIONS.ADD_EMPLOYEE_TO_FAVORITE)
  async companyFavoriteEmployee(
    @Payload() companyEmployeeFavoriteDTO: CompanyEmployeeFavoriteDTO,
  ): Promise<CompanyFavoriteEmployeeResponseDTO> {
    return this.userService.companyFavoriteEmployee(companyEmployeeFavoriteDTO);
  }

  @MessagePattern(USER_SERVICE.ACTIONS.FIND_ALL_EMPLOYEE_FAVORITE)
  async findAllEmployeeFavorite(
    @Payload() employeeFavoriteLookupDTO: EmployeeFavoriteLookupDTO,
  ): Promise<EmployeeFavoritesListItemDTO[]> {
    return this.userService.findAllEmployeeFavorites(employeeFavoriteLookupDTO);
  }

  @MessagePattern(USER_SERVICE.ACTIONS.FIND_ALL_COMPANY_FAVORITE)
  async findAllCompanyFavorite(
    @Payload() companyFavoriteLookupDTO: CompanyFavoriteLookupDTO,
  ): Promise<CompanyFavoritesListItemDTO[]> {
    return this.userService.findAllCompanyFavorites(companyFavoriteLookupDTO);
  }

  @MessagePattern(USER_SERVICE.ACTIONS.COUNT_COMPANY_FAVORITE)
  async countCompanyFavorite(
    @Payload() companyFavoriteLookupDTO: CompanyFavoriteLookupDTO,
  ): Promise<FavoriteCountResponseDTO> {
    return this.userService.countCompanyFavorite(companyFavoriteLookupDTO);
  }

  @MessagePattern(USER_SERVICE.ACTIONS.COUNT_EMPLOYEE_FAVORITE)
  async countEmployeeFavorite(
    @Payload() employeeFavoriteLookupDTO: EmployeeFavoriteLookupDTO,
  ): Promise<FavoriteCountResponseDTO> {
    return this.userService.countEmployeeFavorite(employeeFavoriteLookupDTO);
  }

  @MessagePattern(USER_SERVICE.ACTIONS.FIND_ALL_CAREER_SCOPES)
  async findAllCareerScopes(): Promise<CareerScopesResponseDTO[]> {
    return this.userService.findAllCareerScopes();
  }

  @MessagePattern(USER_SERVICE.ACTIONS.CLEAR_CURRENT_USER_CACHE)
  async clearUserCache(@Payload() userIdDTO: UserIdDTO): Promise<void> {
    return this.userService.clearCurrentUserCache(userIdDTO);
  }

  @MessagePattern(USER_SERVICE.ACTIONS.GET_EMPLOYEE_RECOMMENDATIONS)
  async getEmployeeRecommendations(
    @Payload() employeeRecommendationsDTO: EmployeeRecommendationsDTO,
  ): Promise<CompanyResponseDTO[]> {
    return this.userService.getEmployeeRecommendations(
      employeeRecommendationsDTO,
    );
  }

  @MessagePattern(USER_SERVICE.ACTIONS.GET_COMPANY_RECOMMENDATIONS)
  async getCompanyRecommendations(
    @Payload() companyRecommendationsDTO: CompanyRecommendationsDTO,
  ): Promise<EmployeeResponseDTO[]> {
    return this.userService.getCompanyRecommendations(
      companyRecommendationsDTO,
    );
  }
}
