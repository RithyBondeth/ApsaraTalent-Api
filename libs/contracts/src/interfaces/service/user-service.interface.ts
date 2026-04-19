import { CareerScope } from '@app/common/database/entities/career-scope.entity';
import {
  CompanyResponseDTO,
  CountAllUsersResponseDTO,
  EmployeeResponseDTO,
  SearchEmployeeResponseDTO,
  UpdateCompanyInfoResponseDTO,
  UpdateEmployeeInfoResponseDTO,
  UserResponseDTO,
  FavoriteCountResponseDTO,
  UpdateCompanyInfoDTO,
  UpdateEmployeeInfoDTO,
  SearchEmployeeDTO,
} from '../../dtos/user';
import { UserPaginationDTO, CoreResponseDTO } from '../../dtos/shared';

export const I_UPDATE_EMPLOYEE_INFO_SERVICE = 'IUpdateEmployeeInfoService';
export const I_IMAGE_EMPLOYEE_SERVICE = 'IImageEmployeeService';
export const I_UPDATE_COMPANY_INFO_SERVICE = 'IUpdateCompanyInfoService';
export const I_FIND_EMPLOYEE_SERVICE = 'IFindEmployeeService';
export const I_FIND_COMPANY_SERVICE = 'IFindCompanyService';
export const I_IMAGE_COMPANY_SERVICE = 'IImageCompanyService';
export const I_UPLOAD_EMPLOYEE_REFERENCE_SERVICE =
  'IUploadEmployeeReferenceService';
export const I_SEARCH_EMPLOYEE_SERVICE = 'ISearchEmployeeService';
export const I_USER_SERVICE = 'IUserService';
export const I_OPEN_POSITION_SERVICE = 'IOpenPositionService';
export const I_EXPERIENCE_AND_EDUCATION_SERVICE =
  'IExperienceAndEducationService';

export interface IUpdateEmployeeInfoService {
  updateEmployeeInfo(
    updateEmployeeInfoDTO: UpdateEmployeeInfoDTO,
    employeeId: string,
  ): Promise<UpdateEmployeeInfoResponseDTO>;
}

export interface IImageEmployeeService {
  [key: string]: any;
}

export interface IUpdateCompanyInfoService {
  updateCompanyInfo(
    updateCompanyInfoDTO: UpdateCompanyInfoDTO,
    companyId: string,
  ): Promise<UpdateCompanyInfoResponseDTO>;
}

export interface IFindEmployeeService {
  findAll(pagination: UserPaginationDTO): Promise<EmployeeResponseDTO[]>;
  countAllEmployees(): Promise<CountAllUsersResponseDTO>;
  findOneById(employeeId: string): Promise<EmployeeResponseDTO>;
}

export interface IFindCompanyService {
  findAll(pagination: UserPaginationDTO): Promise<CompanyResponseDTO[]>;
  countAllCompanies(): Promise<CountAllUsersResponseDTO>;
  findOneById(companyId: string): Promise<CompanyResponseDTO>;
}

export interface IImageCompanyService {
  [key: string]: any;
}

export interface IUploadEmployeeReferenceService {
  [key: string]: any;
}

export interface ISearchEmployeeService {
  searchEmployee(
    query: SearchEmployeeDTO,
  ): Promise<SearchEmployeeResponseDTO[]>;
}

export interface IUserService {
  findAllUsers(skip?: number, limit?: number): Promise<UserResponseDTO[]>;
  countAllUsers(): Promise<CountAllUsersResponseDTO>;
  findOneUserByID(userId: string): Promise<UserResponseDTO>;
  updatePushNotificationToken(
    userId: string,
    token: string | null,
  ): Promise<CoreResponseDTO>;
  findAllCareerScopes(): Promise<any>;
  employeeFavoriteCompany(eid: string, cid: string): Promise<CoreResponseDTO>;
  employeeUnfavoriteCompany(
    eid: string,
    cid: string,
    favoriteId: string,
  ): Promise<CoreResponseDTO>;
  companyUnfavoriteEmployee(
    cid: string,
    eid: string,
    favoriteId: string,
  ): Promise<CoreResponseDTO>;
  companyFavoriteEmployee(cid: string, eid: string): Promise<CoreResponseDTO>;
  findAllEmployeeFavorites(eid: string): Promise<CompanyResponseDTO[]>;
  findAllCompanyFavorites(cid: string): Promise<EmployeeResponseDTO[]>;
  countCompanyFavorite(cid: string): Promise<FavoriteCountResponseDTO>;
  countEmployeeFavorite(eid: string): Promise<FavoriteCountResponseDTO>;
  clearCurrentUserCache(userId: string): Promise<void>;
  getEmployeeRecommendations(
    employeeId: string,
    limit?: number,
  ): Promise<CompanyResponseDTO[]>;
  getCompanyRecommendations(
    companyId: string,
    limit?: number,
  ): Promise<EmployeeResponseDTO[]>;
}

export interface IOpenPositionService {
  [key: string]: any;
}

export interface IExperienceAndEducationService {
  [key: string]: any;
}
