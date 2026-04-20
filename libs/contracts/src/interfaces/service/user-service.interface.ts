import { PaginationDTO } from '@app/contracts/dtos/shared';
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
  CareerScopesResponseDTO,
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
    updateEmployeeInfoRequestDTO: UpdateEmployeeInfoRequestDTO,
  ): Promise<UpdateEmployeeInfoResponseDTO>;
}

export interface IImageEmployeeService {
  uploadEmployeeAvatar(
    uploadEmployeeAvatarDTO: UploadEmployeeAvatarDTO,
  ): Promise<CoreResponseDTO>;
  removeEmployeeAvatar(employeeIdDTO: EmployeeIdDTO): Promise<CoreResponseDTO>;
}

export interface IUpdateCompanyInfoService {
  updateCompanyInfo(
    updateCompanyInfoRequestDTO: UpdateCompanyInfoRequestDTO,
  ): Promise<UpdateCompanyInfoResponseDTO>;
}

export interface IFindEmployeeService {
  findAll(paginationDTO: PaginationDTO): Promise<EmployeeResponseDTO[]>;
  countAllEmployees(): Promise<CountAllUsersResponseDTO>;
  findOneById(employeeIdDTO: EmployeeIdDTO): Promise<EmployeeResponseDTO>;
}

export interface IFindCompanyService {
  findAll(paginationDTO: PaginationDTO): Promise<CompanyResponseDTO[]>;
  countAllCompanies(): Promise<CountAllUsersResponseDTO>;
  findOneById(companyIdDTO: CompanyIdDTO): Promise<CompanyResponseDTO>;
}

export interface IImageCompanyService {
  uploadCompanyAvatar(
    uploadCompanyAvatarDTO: UploadCompanyAvatarDTO,
  ): Promise<CoreResponseDTO>;
  removeCompanyAvatar(companyIdDTO: CompanyIdDTO): Promise<CoreResponseDTO>;
  uploadCompanyCover(
    uploadCompanyCoverDTO: UploadCompanyCoverDTO,
  ): Promise<CoreResponseDTO>;
  removeCompanyCover(companyIdDTO: CompanyIdDTO): Promise<CoreResponseDTO>;
  uploadCompanyImages(
    uploadCompanyImagesDTO: UploadCompanyImagesDTO,
  ): Promise<CoreResponseDTO>;
  removeCompanyImage(
    removeCompanyImageDTO: RemoveCompanyImageDTO,
  ): Promise<CoreResponseDTO>;
}

export interface IUploadEmployeeReferenceService {
  uploadEmployeeResume(
    uploadEmployeeResumeDTO: UploadEmployeeResumeDTO,
  ): Promise<CoreResponseDTO>;
  removeEmployeeResume(employeeIdDTO: EmployeeIdDTO): Promise<CoreResponseDTO>;
  uploadEmployeeCoverLetter(
    uploadEmployeeCoverLetterDTO: UploadEmployeeCoverLetterDTO,
  ): Promise<CoreResponseDTO>;
  removeEmployeeCoverLetter(
    employeeIdDTO: EmployeeIdDTO,
  ): Promise<CoreResponseDTO>;
}

export interface ISearchEmployeeService {
  searchEmployee(
    searchEmployeeDTO: SearchEmployeeDTO,
  ): Promise<SearchEmployeeResponseDTO[]>;
}

export interface IUserService {
  findAllUsers(paginationDTO: PaginationDTO): Promise<UserResponseDTO[]>;
  countAllUsers(): Promise<CountAllUsersResponseDTO>;
  findOneUserByID(userIdDTO: UserIdDTO): Promise<UserResponseDTO>;
  updatePushNotificationToken(
    updatePushNotificationTokenDTO: UpdatePushNotificationTokenDTO,
  ): Promise<CoreResponseDTO>;
  findAllCareerScopes(): Promise<CareerScopesResponseDTO[]>;
  employeeFavoriteCompany(
    employeeCompanyFavoriteDTO: EmployeeCompanyFavoriteDTO,
  ): Promise<CoreResponseDTO>;
  employeeUnfavoriteCompany(
    employeeCompanyFavoriteWithFavoriteIdDTO: EmployeeCompanyFavoriteWithFavoriteIdDTO,
  ): Promise<CoreResponseDTO>;
  companyUnfavoriteEmployee(
    companyEmployeeFavoriteWithFavoriteIdDTO: CompanyEmployeeFavoriteWithFavoriteIdDTO,
  ): Promise<CoreResponseDTO>;
  companyFavoriteEmployee(
    companyEmployeeFavoriteDTO: CompanyEmployeeFavoriteDTO,
  ): Promise<CoreResponseDTO>;
  findAllEmployeeFavorites(
    employeeFavoriteLookupDTO: EmployeeFavoriteLookupDTO,
  ): Promise<CompanyResponseDTO[]>;
  findAllCompanyFavorites(
    companyFavoriteLookupDTO: CompanyFavoriteLookupDTO,
  ): Promise<EmployeeResponseDTO[]>;
  countCompanyFavorite(
    companyFavoriteLookupDTO: CompanyFavoriteLookupDTO,
  ): Promise<FavoriteCountResponseDTO>;
  countEmployeeFavorite(
    employeeFavoriteLookupDTO: EmployeeFavoriteLookupDTO,
  ): Promise<FavoriteCountResponseDTO>;
  clearCurrentUserCache(userIdDTO: UserIdDTO): Promise<void>;
  getEmployeeRecommendations(
    employeeRecommendationsDTO: EmployeeRecommendationsDTO,
  ): Promise<CompanyResponseDTO[]>;
  getCompanyRecommendations(
    companyRecommendationsDTO: CompanyRecommendationsDTO,
  ): Promise<EmployeeResponseDTO[]>;
}

export interface IOpenPositionService {
  removeOpenPosition(
    removeOpenPositionDTO: RemoveOpenPositionDTO,
  ): Promise<CoreResponseDTO>;
}

export interface IExperienceAndEducationService {
  removeEmployeeExperience(
    removeEmployeeExperienceDTO: RemoveEmployeeExperienceDTO,
  ): Promise<CoreResponseDTO>;
  removeEmployeeEducation(
    dto: RemoveEmployeeEducationDTO,
  ): Promise<CoreResponseDTO>;
}
