import { EmployeeResponseDTO } from '@app/contracts/dtos/user';
import { CoreResponseDTO } from '@app/contracts/dtos/shared';

export interface IFindEmployeeController {
  findAll(data?: any): Promise<EmployeeResponseDTO[]>;
  findOneById(data?: any): Promise<EmployeeResponseDTO>;
}

export interface IImageEmployeeController {
  uploadEmployeeAvatar(data?: any, file?: any): Promise<CoreResponseDTO>;
  removeEmployeeAvatar(data?: any, file?: any): Promise<CoreResponseDTO>;
}

export interface ISearchEmployeeController {
  searchEmployee(data?: any): Promise<EmployeeResponseDTO[]>;
}

export interface IUpdateEmployeeController {
  updateEmployeeInfo(data?: any, body?: any): Promise<any>;
}

export interface IUploadEmployeeController {
  uploadEmployeeResume(data?: any, file?: any): Promise<CoreResponseDTO>;
  removeEmployeeResume(data?: any): Promise<CoreResponseDTO>;
  uploadEmployeeCoverLetter(data?: any, file?: any): Promise<CoreResponseDTO>;
  removeEmployeeCoverLetter(data?: any): Promise<CoreResponseDTO>;
}

export interface IRemoveEmployeeItemsController {
  removeEmployeeEducation(
    employeeId?: any,
    educationId?: any,
  ): Promise<CoreResponseDTO>;
  removeEmployeeExperience(
    employeeId?: any,
    experienceId?: any,
  ): Promise<CoreResponseDTO>;
}

export interface IEmployeeController
  extends
    IFindEmployeeController,
    IImageEmployeeController,
    ISearchEmployeeController,
    IUpdateEmployeeController,
    IUploadEmployeeController,
    IRemoveEmployeeItemsController {}
