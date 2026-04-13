import { UserResponseDTO } from '@app/contracts/dtos/user';
import { MessageResponse } from '../domain/message-response.interface';

export interface IUserController {
  findAllUsers(data?: any): Promise<UserResponseDTO[]>;
  findOneUserById(data?: any): Promise<UserResponseDTO>;
  getCurrentUser(data?: any): Promise<any>;
  findAllCareerScopes(data?: any): Promise<any>;
  employeeFavoriteCompany(eid?: any, cid?: any): Promise<MessageResponse>;
  employeeUnfavoriteCompany(eid?: any, cid?: any, favoriteId?: string): Promise<MessageResponse>;
  companyFavoriteEmployee(cid?: any, eid?: any): Promise<MessageResponse>;
  companyUnfavoriteEmployee(cid?: any, eid?: any, favoriteId?: string): Promise<MessageResponse>;
  findAllEmployeeFavorite(eid?: any): Promise<any>;
  findAllCompanyFavorite(cid?: any): Promise<any>;
  countEmployeeFavorite(eid?: any): Promise<any>;
  countCompanyFavorite(cid?: any): Promise<any>;
  updatePushNotificationToken?(...args: any[]): Promise<any>;
  getEmployeeRecommendations(employeeId?: any, limit?: any, req?: any): Promise<any>;
  getCompanyRecommendations(companyId?: any, limit?: any, req?: any): Promise<any>;
}
