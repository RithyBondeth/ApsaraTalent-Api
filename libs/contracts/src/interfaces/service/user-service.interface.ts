import { PaginationDTO } from '@app/contracts/dtos/shared';
import {
  CompanyResponseDTO,
  CompanyEmployeeFavoriteDTO,
  CompanyEmployeeFavoriteWithFavoriteIdDTO,
  CompanyFavoriteLookupDTO,
  CompanyFavoriteEmployeeResponseDTO,
  CompanyIdDTO,
  CompanyRecommendationsDTO,
  CompanyUnfavoriteEmployeeResponseDTO,
  CountAllUsersResponseDTO,
  EmployeeCompanyFavoriteDTO,
  EmployeeCompanyFavoriteWithFavoriteIdDTO,
  EmployeeFavoriteLookupDTO,
  EmployeeFavoriteCompanyResponseDTO,
  EmployeeIdDTO,
  EmployeeRecommendationsDTO,
  EmployeeResponseDTO,
  EmployeeUnfavoriteCompanyResponseDTO,
  CareerScopesResponseDTO,
  EmployeeFavoritesListItemDTO,
  CompanyFavoritesListItemDTO,
  RemoveCompanyImageDTO,
  RemoveCompanyImageDTO as RemoveCompanyImagesDTO,
  RemoveCompanyImageResponseDTO,
  RemoveCompanyAvatarResponseDTO,
  RemoveCompanyCoverResponseDTO,
  RemoveEmployeeEducationDTO,
  RemoveEmployeeEducationResponseDTO,
  RemoveEmployeeExperienceDTO,
  RemoveEmployeeExperienceResponseDTO,
  RemoveOpenPositionDTO,
  RemoveOpenPositionResponseDTO,
  RemoveEmployeeAvatarResponseDTO,
  RemoveEmployeeCoverLetterResponseDTO,
  RemoveEmployeeResumeResponseDTO,
  SearchEmployeeResponseDTO,
  UpdateCompanyInfoRequestDTO,
  UpdateCompanyInfoResponseDTO,
  UpdateEmployeeInfoRequestDTO,
  UpdateEmployeeInfoResponseDTO,
  UpdatePushNotificationTokenDTO,
  UpdatePushNotificationTokenResponseDTO,
  UploadCompanyAvatarDTO,
  UploadCompanyAvatarResponseDTO,
  UploadCompanyCoverDTO,
  UploadCompanyCoverResponseDTO,
  UploadCompanyImagesDTO,
  UploadCompanyImagesResponseDTO,
  UploadEmployeeAvatarDTO,
  UploadEmployeeAvatarResponseDTO,
  UploadEmployeeCoverLetterDTO,
  UploadEmployeeCoverLetterResponseDTO,
  UploadEmployeeResumeDTO,
  UploadEmployeeResumeResponseDTO,
  UserResponseDTO,
  FavoriteCountResponseDTO,
  SearchEmployeeDTO,
  UserIdDTO,
} from '../../dtos/user';

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
  ): Promise<UploadEmployeeAvatarResponseDTO>;
  removeEmployeeAvatar(
    employeeIdDTO: EmployeeIdDTO,
  ): Promise<RemoveEmployeeAvatarResponseDTO>;
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
  ): Promise<UploadCompanyAvatarResponseDTO>;
  removeCompanyAvatar(
    companyIdDTO: CompanyIdDTO,
  ): Promise<RemoveCompanyAvatarResponseDTO>;
  uploadCompanyCover(
    uploadCompanyCoverDTO: UploadCompanyCoverDTO,
  ): Promise<UploadCompanyCoverResponseDTO>;
  removeCompanyCover(
    companyIdDTO: CompanyIdDTO,
  ): Promise<RemoveCompanyCoverResponseDTO>;
  uploadCompanyImages(
    uploadCompanyImagesDTO: UploadCompanyImagesDTO,
  ): Promise<UploadCompanyImagesResponseDTO>;
  removeCompanyImage(
    removeCompanyImageDTO: RemoveCompanyImageDTO,
  ): Promise<RemoveCompanyImageResponseDTO>;
}

export interface IUploadEmployeeReferenceService {
  uploadEmployeeResume(
    uploadEmployeeResumeDTO: UploadEmployeeResumeDTO,
  ): Promise<UploadEmployeeResumeResponseDTO>;
  removeEmployeeResume(
    employeeIdDTO: EmployeeIdDTO,
  ): Promise<RemoveEmployeeResumeResponseDTO>;
  uploadEmployeeCoverLetter(
    uploadEmployeeCoverLetterDTO: UploadEmployeeCoverLetterDTO,
  ): Promise<UploadEmployeeCoverLetterResponseDTO>;
  removeEmployeeCoverLetter(
    employeeIdDTO: EmployeeIdDTO,
  ): Promise<RemoveEmployeeCoverLetterResponseDTO>;
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
  ): Promise<UpdatePushNotificationTokenResponseDTO>;
  findAllCareerScopes(): Promise<CareerScopesResponseDTO[]>;
  employeeFavoriteCompany(
    employeeCompanyFavoriteDTO: EmployeeCompanyFavoriteDTO,
  ): Promise<EmployeeFavoriteCompanyResponseDTO>;
  employeeUnfavoriteCompany(
    employeeCompanyFavoriteWithFavoriteIdDTO: EmployeeCompanyFavoriteWithFavoriteIdDTO,
  ): Promise<EmployeeUnfavoriteCompanyResponseDTO>;
  companyUnfavoriteEmployee(
    companyEmployeeFavoriteWithFavoriteIdDTO: CompanyEmployeeFavoriteWithFavoriteIdDTO,
  ): Promise<CompanyUnfavoriteEmployeeResponseDTO>;
  companyFavoriteEmployee(
    companyEmployeeFavoriteDTO: CompanyEmployeeFavoriteDTO,
  ): Promise<CompanyFavoriteEmployeeResponseDTO>;
  findAllEmployeeFavorites(
    employeeFavoriteLookupDTO: EmployeeFavoriteLookupDTO,
  ): Promise<EmployeeFavoritesListItemDTO[]>;
  findAllCompanyFavorites(
    companyFavoriteLookupDTO: CompanyFavoriteLookupDTO,
  ): Promise<CompanyFavoritesListItemDTO[]>;
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
  ): Promise<RemoveOpenPositionResponseDTO>;
}

export interface IExperienceAndEducationService {
  removeEmployeeExperience(
    removeEmployeeExperienceDTO: RemoveEmployeeExperienceDTO,
  ): Promise<RemoveEmployeeExperienceResponseDTO>;
  removeEmployeeEducation(
    removeEmployeeEducationDTO: RemoveEmployeeEducationDTO,
  ): Promise<RemoveEmployeeEducationResponseDTO>;
}
