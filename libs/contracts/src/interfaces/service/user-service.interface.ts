import { CareerScope } from '@app/common/database/entities/career-scope.entity';
import {
  CompanyResponseDTO,
  CompanyEmployeeFavoriteDTO,
  CompanyEmployeeFavoriteWithFavoriteIdDTO,
  CompanyFavoriteLookupDTO,
  CompanyIdDTO,
  CompanyRecommendationsDTO,
  CountAllUsersResponseDTO,
  EmployeeCompanyFavoriteDTO,
  EmployeeCompanyFavoriteWithFavoriteIdDTO,
  EmployeeFavoriteLookupDTO,
  EmployeeIdDTO,
  EmployeeRecommendationsDTO,
  EmployeeResponseDTO,
  PaginationRequestDTO,
  RemoveCompanyImageDTO,
  RemoveCompanyImageDTO as RemoveCompanyImagesDTO,
  RemoveEmployeeEducationDTO,
  RemoveEmployeeExperienceDTO,
  RemoveOpenPositionDTO,
  SearchEmployeeResponseDTO,
  UpdateCompanyInfoRequestDTO,
  UpdateCompanyInfoResponseDTO,
  UpdateEmployeeInfoRequestDTO,
  UpdateEmployeeInfoResponseDTO,
  UpdatePushNotificationTokenDTO,
  UploadCompanyAvatarDTO,
  UploadCompanyCoverDTO,
  UploadCompanyImagesDTO,
  UploadEmployeeAvatarDTO,
  UploadEmployeeCoverLetterDTO,
  UploadEmployeeResumeDTO,
  UserResponseDTO,
  FavoriteCountResponseDTO,
  SearchEmployeeDTO,
  UserIdDTO,
} from '../../dtos/user';
import { CoreResponseDTO } from '../../dtos/shared';

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
    dto: UpdateEmployeeInfoRequestDTO,
  ): Promise<UpdateEmployeeInfoResponseDTO>;
}

export interface IImageEmployeeService {
  uploadEmployeeAvatar(dto: UploadEmployeeAvatarDTO): Promise<CoreResponseDTO>;
  removeEmployeeAvatar(dto: EmployeeIdDTO): Promise<CoreResponseDTO>;
}

export interface IUpdateCompanyInfoService {
  updateCompanyInfo(
    dto: UpdateCompanyInfoRequestDTO,
  ): Promise<UpdateCompanyInfoResponseDTO>;
}

export interface IFindEmployeeService {
  findAll(pagination: PaginationRequestDTO): Promise<EmployeeResponseDTO[]>;
  countAllEmployees(): Promise<CountAllUsersResponseDTO>;
  findOneById(dto: EmployeeIdDTO): Promise<EmployeeResponseDTO>;
}

export interface IFindCompanyService {
  findAll(pagination: PaginationRequestDTO): Promise<CompanyResponseDTO[]>;
  countAllCompanies(): Promise<CountAllUsersResponseDTO>;
  findOneById(dto: CompanyIdDTO): Promise<CompanyResponseDTO>;
}

export interface IImageCompanyService {
  uploadCompanyAvatar(dto: UploadCompanyAvatarDTO): Promise<CoreResponseDTO>;
  removeCompanyAvatar(dto: CompanyIdDTO): Promise<CoreResponseDTO>;
  uploadCompanyCover(dto: UploadCompanyCoverDTO): Promise<CoreResponseDTO>;
  removeCompanyCover(dto: CompanyIdDTO): Promise<CoreResponseDTO>;
  uploadCompanyImages(dto: UploadCompanyImagesDTO): Promise<CoreResponseDTO>;
  removeCompanyImage(dto: RemoveCompanyImageDTO): Promise<CoreResponseDTO>;
}

export interface IUploadEmployeeReferenceService {
  uploadEmployeeResume(dto: UploadEmployeeResumeDTO): Promise<CoreResponseDTO>;
  removeEmployeeResume(dto: EmployeeIdDTO): Promise<CoreResponseDTO>;
  uploadEmployeeCoverLetter(
    dto: UploadEmployeeCoverLetterDTO,
  ): Promise<CoreResponseDTO>;
  removeEmployeeCoverLetter(dto: EmployeeIdDTO): Promise<CoreResponseDTO>;
}

export interface ISearchEmployeeService {
  searchEmployee(
    query: SearchEmployeeDTO,
  ): Promise<SearchEmployeeResponseDTO[]>;
}

export interface IUserService {
  findAllUsers(dto: PaginationRequestDTO): Promise<UserResponseDTO[]>;
  countAllUsers(): Promise<CountAllUsersResponseDTO>;
  findOneUserByID(dto: UserIdDTO): Promise<UserResponseDTO>;
  updatePushNotificationToken(
    dto: UpdatePushNotificationTokenDTO,
  ): Promise<CoreResponseDTO>;
  findAllCareerScopes(): Promise<CareerScope[]>;
  employeeFavoriteCompany(
    dto: EmployeeCompanyFavoriteDTO,
  ): Promise<CoreResponseDTO>;
  employeeUnfavoriteCompany(
    dto: EmployeeCompanyFavoriteWithFavoriteIdDTO,
  ): Promise<CoreResponseDTO>;
  companyUnfavoriteEmployee(
    dto: CompanyEmployeeFavoriteWithFavoriteIdDTO,
  ): Promise<CoreResponseDTO>;
  companyFavoriteEmployee(
    dto: CompanyEmployeeFavoriteDTO,
  ): Promise<CoreResponseDTO>;
  findAllEmployeeFavorites(
    dto: EmployeeFavoriteLookupDTO,
  ): Promise<CompanyResponseDTO[]>;
  findAllCompanyFavorites(
    dto: CompanyFavoriteLookupDTO,
  ): Promise<EmployeeResponseDTO[]>;
  countCompanyFavorite(
    dto: CompanyFavoriteLookupDTO,
  ): Promise<FavoriteCountResponseDTO>;
  countEmployeeFavorite(
    dto: EmployeeFavoriteLookupDTO,
  ): Promise<FavoriteCountResponseDTO>;
  clearCurrentUserCache(dto: UserIdDTO): Promise<void>;
  getEmployeeRecommendations(
    dto: EmployeeRecommendationsDTO,
  ): Promise<CompanyResponseDTO[]>;
  getCompanyRecommendations(
    dto: CompanyRecommendationsDTO,
  ): Promise<EmployeeResponseDTO[]>;
}

export interface IOpenPositionService {
  removeOpenPosition(dto: RemoveOpenPositionDTO): Promise<CoreResponseDTO>;
}

export interface IExperienceAndEducationService {
  removeEmployeeExperience(
    dto: RemoveEmployeeExperienceDTO,
  ): Promise<CoreResponseDTO>;
  removeEmployeeEducation(
    dto: RemoveEmployeeEducationDTO,
  ): Promise<CoreResponseDTO>;
}
