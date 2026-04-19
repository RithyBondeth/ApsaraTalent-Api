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
  PaginationRequestDTO,
  UpdatePushNotificationTokenBodyDTO,
  UpdatePushNotificationTokenDTO,
  UserIdDTO,
} from '@app/contracts/dtos/user';
import { CoreResponseDTO } from '@app/contracts/dtos/shared';

export interface IUserController {
  findAllUsers(data: PaginationRequestDTO): Promise<UserResponseDTO[]>;
  findOneUserById(data: string): Promise<UserResponseDTO>;
  getCurrentUser(data?: any): Promise<UserResponseDTO>;
  findAllCareerScopes(): Promise<any>;
  employeeFavoriteCompany(dto: EmployeeCompanyFavoriteDTO): Promise<CoreResponseDTO>;
  employeeUnfavoriteCompany(
    dto: EmployeeCompanyFavoriteWithFavoriteIdDTO,
  ): Promise<CoreResponseDTO>;
  companyFavoriteEmployee(dto: CompanyEmployeeFavoriteDTO): Promise<CoreResponseDTO>;
  companyUnfavoriteEmployee(
    dto: CompanyEmployeeFavoriteWithFavoriteIdDTO,
  ): Promise<CoreResponseDTO>;
  findAllEmployeeFavorite(dto: EmployeeFavoriteLookupDTO): Promise<CompanyResponseDTO[]>;
  findAllCompanyFavorite(dto: CompanyFavoriteLookupDTO): Promise<EmployeeResponseDTO[]>;
  countEmployeeFavorite(dto: EmployeeFavoriteLookupDTO): Promise<FavoriteCountResponseDTO>;
  countCompanyFavorite(dto: CompanyFavoriteLookupDTO): Promise<FavoriteCountResponseDTO>;
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
  findAllUsers(data: PaginationRequestDTO): Promise<UserResponseDTO[]>;
  findOneUserById(data: UserIdDTO): Promise<UserResponseDTO>;
  getCurrentUser(data: UserIdDTO): Promise<UserResponseDTO>;
  findAllCareerScopes(): Promise<any>;
  employeeFavoriteCompany(dto: EmployeeCompanyFavoriteDTO): Promise<CoreResponseDTO>;
  employeeUnfavoriteCompany(
    dto: EmployeeCompanyFavoriteWithFavoriteIdDTO,
  ): Promise<CoreResponseDTO>;
  companyFavoriteEmployee(dto: CompanyEmployeeFavoriteDTO): Promise<CoreResponseDTO>;
  companyUnfavoriteEmployee(
    dto: CompanyEmployeeFavoriteWithFavoriteIdDTO,
  ): Promise<CoreResponseDTO>;
  findAllEmployeeFavorite(dto: EmployeeFavoriteLookupDTO): Promise<CompanyResponseDTO[]>;
  findAllCompanyFavorite(dto: CompanyFavoriteLookupDTO): Promise<EmployeeResponseDTO[]>;
  countEmployeeFavorite(dto: EmployeeFavoriteLookupDTO): Promise<FavoriteCountResponseDTO>;
  countCompanyFavorite(dto: CompanyFavoriteLookupDTO): Promise<FavoriteCountResponseDTO>;
  updatePushNotificationToken(dto: UpdatePushNotificationTokenDTO): Promise<CoreResponseDTO>;
  clearUserCache(dto: UserIdDTO): Promise<void>;
  getEmployeeRecommendations(
    dto: EmployeeRecommendationsDTO,
  ): Promise<CompanyResponseDTO[]>;
  getCompanyRecommendations(
    dto: CompanyRecommendationsDTO,
  ): Promise<EmployeeResponseDTO[]>;
}
