import { CoreResponseDTO, PaginationDTO } from '@app/contracts/dtos/shared';
import {
  EmployeeIdDTO,
  EmployeeResponseDTO,
  PaginationRequestDTO,
  RemoveEmployeeEducationDTO,
  RemoveEmployeeExperienceDTO,
  SearchEmployeeDTO,
  SearchEmployeeResponseDTO,
  UpdateEmployeeInfoDTO,
  UpdateEmployeeInfoRequestDTO,
  UpdateEmployeeInfoResponseDTO,
  UploadEmployeeAvatarDTO,
  UploadEmployeeCoverLetterDTO,
  UploadEmployeeResumeDTO,
} from '@app/contracts/dtos/user';

export interface IFindEmployeeController {
  findAll(data: PaginationDTO): Promise<EmployeeResponseDTO[]>;
  findOneById(data: string): Promise<EmployeeResponseDTO>;
}

export interface IFindEmployeeRpcController {
  findAll(data: PaginationRequestDTO): Promise<EmployeeResponseDTO[]>;
  findOneById(data: EmployeeIdDTO): Promise<EmployeeResponseDTO>;
}

export interface IImageEmployeeController {
  uploadEmployeeAvatar(
    employeeId: string,
    file: Express.Multer.File,
  ): Promise<CoreResponseDTO>;
  removeEmployeeAvatar(employeeId: string): Promise<CoreResponseDTO>;
}

export interface IImageEmployeeRpcController {
  uploadEmployeeAvatar(data: UploadEmployeeAvatarDTO): Promise<CoreResponseDTO>;
  removeEmployeeAvatar(data: EmployeeIdDTO): Promise<CoreResponseDTO>;
}

export interface ISearchEmployeeController {
  searchEmployee(data: SearchEmployeeDTO): Promise<SearchEmployeeResponseDTO[]>;
}

export interface IUpdateEmployeeController {
  updateEmployeeInfo(
    employeeId: string,
    body: UpdateEmployeeInfoDTO,
  ): Promise<UpdateEmployeeInfoResponseDTO>;
}

export interface IUpdateEmployeeRpcController {
  updateEmployeeInfo(
    data: UpdateEmployeeInfoRequestDTO,
  ): Promise<UpdateEmployeeInfoResponseDTO>;
}

export interface IUploadEmployeeController {
  uploadEmployeeResume(
    employeeId: string,
    file: Express.Multer.File,
  ): Promise<CoreResponseDTO>;
  removeEmployeeResume(employeeId: string): Promise<CoreResponseDTO>;
  uploadEmployeeCoverLetter(
    employeeId: string,
    file: Express.Multer.File,
  ): Promise<CoreResponseDTO>;
  removeEmployeeCoverLetter(employeeId: string): Promise<CoreResponseDTO>;
}

export interface IUploadEmployeeRpcController {
  uploadEmployeeResume(data: UploadEmployeeResumeDTO): Promise<CoreResponseDTO>;
  removeEmployeeResume(data: EmployeeIdDTO): Promise<CoreResponseDTO>;
  uploadEmployeeCoverLetter(
    data: UploadEmployeeCoverLetterDTO,
  ): Promise<CoreResponseDTO>;
  removeEmployeeCoverLetter(data: EmployeeIdDTO): Promise<CoreResponseDTO>;
}

export interface IRemoveEmployeeItemsController {
  removeEmployeeEducation(
    employeeId: string,
    educationId: string,
  ): Promise<CoreResponseDTO>;
  removeEmployeeExperience(
    employeeId: string,
    experienceId: string,
  ): Promise<CoreResponseDTO>;
}

export interface IRemoveEmployeeItemsRpcController {
  removeEmployeeEducation(
    data: RemoveEmployeeEducationDTO,
  ): Promise<CoreResponseDTO>;
  removeEmployeeExperience(
    data: RemoveEmployeeExperienceDTO,
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

export interface IEmployeeRpcController
  extends
    IFindEmployeeRpcController,
    IImageEmployeeRpcController,
    ISearchEmployeeController,
    IUpdateEmployeeRpcController,
    IUploadEmployeeRpcController,
    IRemoveEmployeeItemsRpcController {}
