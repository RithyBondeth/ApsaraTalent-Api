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
  updateEmployeeInfo(...args: any[]): Promise<any>;
}

export interface IImageEmployeeService {
  [key: string]: any;
}

export interface IUpdateCompanyInfoService {
  updateCompanyInfo(...args: any[]): Promise<any>;
}

export interface IFindEmployeeService {
  [key: string]: any;
}

export interface IFindCompanyService {
  [key: string]: any;
}

export interface IImageCompanyService {
  [key: string]: any;
}

export interface IUploadEmployeeReferenceService {
  [key: string]: any;
}

export interface ISearchEmployeeService {
  [key: string]: any;
}

export interface IUserService {
  [key: string]: any;
}

export interface IOpenPositionService {
  [key: string]: any;
}

export interface IExperienceAndEducationService {
  [key: string]: any;
}
