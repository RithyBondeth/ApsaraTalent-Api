import {
  UserResponseDTO,
  CompanyResponseDTO,
  EmployeeResponseDTO,
  FavoriteCountResponseDTO,
} from '@app/contracts/dtos/user';
import { CoreResponseDTO } from '@app/contracts/dtos/shared';

export interface IUserController {
  findAllUsers(data?: any): Promise<UserResponseDTO[]>;
  findOneUserById(data?: any): Promise<UserResponseDTO>;
  getCurrentUser(data?: any): Promise<UserResponseDTO>;
  findAllCareerScopes(data?: any): Promise<any>;
  employeeFavoriteCompany(eid?: any, cid?: any): Promise<CoreResponseDTO>;
  employeeUnfavoriteCompany(
    eid?: any,
    cid?: any,
    favoriteId?: string,
  ): Promise<CoreResponseDTO>;
  companyFavoriteEmployee(cid?: any, eid?: any): Promise<CoreResponseDTO>;
  companyUnfavoriteEmployee(
    cid?: any,
    eid?: any,
    favoriteId?: string,
  ): Promise<CoreResponseDTO>;
  findAllEmployeeFavorite(eid?: any): Promise<CompanyResponseDTO[]>;
  findAllCompanyFavorite(cid?: any): Promise<EmployeeResponseDTO[]>;
  countEmployeeFavorite(eid?: any): Promise<FavoriteCountResponseDTO>;
  countCompanyFavorite(cid?: any): Promise<FavoriteCountResponseDTO>;
  updatePushNotificationToken?(...args: any[]): Promise<CoreResponseDTO>;
  getEmployeeRecommendations(
    employeeId?: any,
    limit?: any,
    req?: any,
  ): Promise<CompanyResponseDTO[]>;
  getCompanyRecommendations(
    companyId?: any,
    limit?: any,
    req?: any,
  ): Promise<EmployeeResponseDTO[]>;
}
