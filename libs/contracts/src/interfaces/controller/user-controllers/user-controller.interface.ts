import {
  CompanyEmployeeFavoriteDTO,
  CompanyEmployeeFavoriteWithFavoriteIdDTO,
  UserResponseDTO,
  CompanyResponseDTO,
  CompanyFavoriteLookupDTO,
  CompanyRecommendationsDTO,
  CompanyFavoriteEmployeeResponseDTO,
  CompanyUnfavoriteEmployeeResponseDTO,
  EmployeeCompanyFavoriteDTO,
  EmployeeCompanyFavoriteWithFavoriteIdDTO,
  EmployeeFavoriteCompanyResponseDTO,
  EmployeeResponseDTO,
  EmployeeFavoriteLookupDTO,
  EmployeeRecommendationsDTO,
  EmployeeUnfavoriteCompanyResponseDTO,
  FavoriteCountResponseDTO,
  UpdatePushNotificationTokenBodyDTO,
  UpdatePushNotificationTokenDTO,
  UpdatePushNotificationTokenResponseDTO,
  UserIdDTO,
  CareerScopesResponseDTO,
  EmployeeFavoritesListItemDTO,
  CompanyFavoritesListItemDTO,
} from '@app/contracts/dtos/user';
import { PaginationDTO } from '@app/contracts/dtos/shared';
import { AuthUser } from '@app/common/decorators/user.decorator';

export interface IUserController {
  findAllUsers(paginationDTO: PaginationDTO): Promise<UserResponseDTO[]>;
  findOneUserById(userIdDTO: string): Promise<UserResponseDTO>;
  getCurrentUser(user: AuthUser): Promise<UserResponseDTO>;
  findAllCareerScopes(): Promise<CareerScopesResponseDTO[]>;
  employeeFavoriteCompany(
    employeeCompanyFavoriteDTO: EmployeeCompanyFavoriteDTO,
    req?: any,
  ): Promise<EmployeeFavoriteCompanyResponseDTO>;
  employeeUnfavoriteCompany(
    employeeCompanyFavoriteWithFavoriteIdDTO: EmployeeCompanyFavoriteWithFavoriteIdDTO,
    req?: any,
  ): Promise<EmployeeUnfavoriteCompanyResponseDTO>;
  companyFavoriteEmployee(
    companyEmployeeFavoriteDTO: CompanyEmployeeFavoriteDTO,
    req?: any,
  ): Promise<CompanyFavoriteEmployeeResponseDTO>;
  companyUnfavoriteEmployee(
    companyEmployeeFavoriteWithFavoriteIdDTO: CompanyEmployeeFavoriteWithFavoriteIdDTO,
    req?: any,
  ): Promise<CompanyUnfavoriteEmployeeResponseDTO>;
  findAllEmployeeFavorite(
    employeeFavoriteLookupDTO: EmployeeFavoriteLookupDTO,
    req?: any,
  ): Promise<EmployeeFavoritesListItemDTO[]>;
  findAllCompanyFavorite(
    companyFavoriteLookupDTO: CompanyFavoriteLookupDTO,
    req?: any,
  ): Promise<CompanyFavoritesListItemDTO[]>;
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
  ): Promise<UpdatePushNotificationTokenResponseDTO>;
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
  ): Promise<EmployeeFavoriteCompanyResponseDTO>;
  employeeUnfavoriteCompany(
    employeeCompanyFavoriteWithFavoriteIdDTO: EmployeeCompanyFavoriteWithFavoriteIdDTO,
  ): Promise<EmployeeUnfavoriteCompanyResponseDTO>;
  companyFavoriteEmployee(
    companyEmployeeFavoriteDTO: CompanyEmployeeFavoriteDTO,
  ): Promise<CompanyFavoriteEmployeeResponseDTO>;
  companyUnfavoriteEmployee(
    companyEmployeeFavoriteWithFavoriteIdDTO: CompanyEmployeeFavoriteWithFavoriteIdDTO,
  ): Promise<CompanyUnfavoriteEmployeeResponseDTO>;
  findAllEmployeeFavorite(
    employeeFavoriteLookupDTO: EmployeeFavoriteLookupDTO,
  ): Promise<EmployeeFavoritesListItemDTO[]>;
  findAllCompanyFavorite(
    companyFavoriteLookupDTO: CompanyFavoriteLookupDTO,
  ): Promise<CompanyFavoritesListItemDTO[]>;
  countEmployeeFavorite(
    employeeFavoriteLookupDTO: EmployeeFavoriteLookupDTO,
  ): Promise<FavoriteCountResponseDTO>;
  countCompanyFavorite(
    companyFavoriteLookupDTO: CompanyFavoriteLookupDTO,
  ): Promise<FavoriteCountResponseDTO>;
  updatePushNotificationToken(
    updatePushNotificationTokenDTO: UpdatePushNotificationTokenDTO,
  ): Promise<UpdatePushNotificationTokenResponseDTO>;
  clearUserCache(userIdDTO: UserIdDTO): Promise<void>;
  getEmployeeRecommendations(
    employeeRecommendationsDTO: EmployeeRecommendationsDTO,
  ): Promise<CompanyResponseDTO[]>;
  getCompanyRecommendations(
    companyRecommendationsDTO: CompanyRecommendationsDTO,
  ): Promise<EmployeeResponseDTO[]>;
}
