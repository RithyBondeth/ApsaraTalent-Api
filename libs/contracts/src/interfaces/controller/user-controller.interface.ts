import {
  CompanyEmployeeFavoriteDTO,
  CompanyEmployeeFavoriteWithFavoriteIdDTO,
  UserResponseDTO,
  CompanyResponseDTO,
  CompanyFavoriteLookupDTO,
  CompanyRecommendationsDTO,
  EmployeeCompanyFavoriteDTO,
  EmployeeCompanyFavoriteWithFavoriteIdDTO,
  EmployeeResponseDTO,
  EmployeeFavoriteLookupDTO,
  EmployeeRecommendationsDTO,
  FavoriteCountResponseDTO,
  UpdatePushNotificationTokenBodyDTO,
  UpdatePushNotificationTokenDTO,
  UserIdDTO,
  CareerScopesResponseDTO,
} from '@app/contracts/dtos/user';
import { CoreResponseDTO, PaginationDTO } from '@app/contracts/dtos/shared';
import { AuthUser } from '@app/common/decorators/user.decorator';

export interface IUserController {
  findAllUsers(paginationDTO: PaginationDTO): Promise<UserResponseDTO[]>;
  findOneUserById(userIdDTO: string): Promise<UserResponseDTO>;
  getCurrentUser(user: AuthUser): Promise<UserResponseDTO>;
  findAllCareerScopes(): Promise<CareerScopesResponseDTO[]>;
  employeeFavoriteCompany(
    employeeCompanyFavoriteDTO: EmployeeCompanyFavoriteDTO,
    req?: any,
  ): Promise<CoreResponseDTO>;
  employeeUnfavoriteCompany(
    employeeCompanyFavoriteWithFavoriteIdDTO: EmployeeCompanyFavoriteWithFavoriteIdDTO,
    req?: any,
  ): Promise<CoreResponseDTO>;
  companyFavoriteEmployee(
    companyEmployeeFavoriteDTO: CompanyEmployeeFavoriteDTO,
    req?: any,
  ): Promise<CoreResponseDTO>;
  companyUnfavoriteEmployee(
    companyEmployeeFavoriteWithFavoriteIdDTO: CompanyEmployeeFavoriteWithFavoriteIdDTO,
    req?: any,
  ): Promise<CoreResponseDTO>;
  findAllEmployeeFavorite(
    employeeFavoriteLookupDTO: EmployeeFavoriteLookupDTO,
    req?: any,
  ): Promise<CompanyResponseDTO[]>;
  findAllCompanyFavorite(
    companyFavoriteLookupDTO: CompanyFavoriteLookupDTO,
    req?: any,
  ): Promise<EmployeeResponseDTO[]>;
  countEmployeeFavorite(
    employeeFavoriteLookupDTO: EmployeeFavoriteLookupDTO,
    req?: any,
  ): Promise<FavoriteCountResponseDTO>;
  countCompanyFavorite(
    companyFavoriteLookupDTO: CompanyFavoriteLookupDTO,
    req?: any,
  ): Promise<FavoriteCountResponseDTO>;
  updatePushNotificationToken?(
    req: any,
    body: UpdatePushNotificationTokenBodyDTO,
  ): Promise<CoreResponseDTO>;
  getEmployeeRecommendations(
    employeeId: string,
    limit?: number,
    req?: any,
  ): Promise<CompanyResponseDTO[]>;
  getCompanyRecommendations(
    companyId: string,
    limit?: number,
    req?: any,
  ): Promise<EmployeeResponseDTO[]>;
}

export interface IUserRpcController {
  findAllUsers(paginationDTO: PaginationDTO): Promise<UserResponseDTO[]>;
  findOneUserById(userIdDTO: UserIdDTO): Promise<UserResponseDTO>;
  getCurrentUser(userIdDTO: UserIdDTO): Promise<UserResponseDTO>;
  findAllCareerScopes(): Promise<CareerScopesResponseDTO[]>;
  employeeFavoriteCompany(
    employeeCompanyFavoriteDTO: EmployeeCompanyFavoriteDTO,
  ): Promise<CoreResponseDTO>;
  employeeUnfavoriteCompany(
    employeeCompanyFavoriteWithFavoriteIdDTO: EmployeeCompanyFavoriteWithFavoriteIdDTO,
  ): Promise<CoreResponseDTO>;
  companyFavoriteEmployee(
    companyEmployeeFavoriteDTO: CompanyEmployeeFavoriteDTO,
  ): Promise<CoreResponseDTO>;
  companyUnfavoriteEmployee(
    companyEmployeeFavoriteWithFavoriteIdDTO: CompanyEmployeeFavoriteWithFavoriteIdDTO,
  ): Promise<CoreResponseDTO>;
  findAllEmployeeFavorite(
    employeeFavoriteLookupDTO: EmployeeFavoriteLookupDTO,
  ): Promise<CompanyResponseDTO[]>;
  findAllCompanyFavorite(
    companyFavoriteLookupDTO: CompanyFavoriteLookupDTO,
  ): Promise<EmployeeResponseDTO[]>;
  countEmployeeFavorite(
    employeeFavoriteLookupDTO: EmployeeFavoriteLookupDTO,
  ): Promise<FavoriteCountResponseDTO>;
  countCompanyFavorite(
    companyFavoriteLookupDTO: CompanyFavoriteLookupDTO,
  ): Promise<FavoriteCountResponseDTO>;
  updatePushNotificationToken(
    updatePushNotificationTokenDTO: UpdatePushNotificationTokenDTO,
  ): Promise<CoreResponseDTO>;
  clearUserCache(userIdDTO: UserIdDTO): Promise<void>;
  getEmployeeRecommendations(
    employeeRecommendationsDTO: EmployeeRecommendationsDTO,
  ): Promise<CompanyResponseDTO[]>;
  getCompanyRecommendations(
    companyRecommendationsDTO: CompanyRecommendationsDTO,
  ): Promise<EmployeeResponseDTO[]>;
}
