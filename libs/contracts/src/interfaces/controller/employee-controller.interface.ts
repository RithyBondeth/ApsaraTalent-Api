import { EmployeeResponseDTO } from '@app/contracts/dtos/user';
import { MessageResponse } from '../domain/message-response.interface';

export interface IFindEmployeeController {
  findAll(data?: any): Promise<EmployeeResponseDTO[]>;
  findOneById(data?: any): Promise<EmployeeResponseDTO>;
}

export interface IImageEmployeeController {
  uploadEmployeeAvatar(data?: any, file?: any): Promise<MessageResponse>;
  removeEmployeeAvatar(data?: any, file?: any): Promise<MessageResponse>;
}

export interface ISearchEmployeeController {
  searchEmployee(data?: any): Promise<EmployeeResponseDTO[]>;
}

export interface IUpdateEmployeeController {
  updateEmployeeInfo(data?: any, body?: any): Promise<any>;
}

export interface IUploadEmployeeController {
  uploadEmployeeResume(data?: any, file?: any): Promise<MessageResponse>;
  removeEmployeeResume(data?: any): Promise<MessageResponse>;
  uploadEmployeeCoverLetter(data?: any, file?: any): Promise<MessageResponse>;
  removeEmployeeCoverLetter(data?: any): Promise<MessageResponse>;
}

export interface IRemoveEmployeeItemsController {
  removeEmployeeEducation(employeeId?: any, educationId?: any): Promise<any>;
  removeEmployeeExperience(employeeId?: any, experienceId?: any): Promise<any>;
}

export interface IEmployeeController
  extends
    IFindEmployeeController,
    IImageEmployeeController,
    ISearchEmployeeController,
    IUpdateEmployeeController,
    IUploadEmployeeController,
    IRemoveEmployeeItemsController {}
