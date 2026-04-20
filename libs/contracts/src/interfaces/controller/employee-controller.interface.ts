import { CoreResponseDTO, PaginationDTO } from '@app/contracts/dtos/shared';
import {
  CountAllUsersResponseDTO,
  EmployeeIdDTO,
  EmployeeResponseDTO,
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
  findAll(paginationDTO: PaginationDTO): Promise<EmployeeResponseDTO[]>;
  findOneById(employeeId: string): Promise<EmployeeResponseDTO>;
}

export interface IFindEmployeeRpcController {
  findAll(paginationDTO: PaginationDTO): Promise<EmployeeResponseDTO[]>;
  findOneById(employeeIdDTO: EmployeeIdDTO): Promise<EmployeeResponseDTO>;
  countAllEmployees(): Promise<CountAllUsersResponseDTO>;
}

export interface IImageEmployeeController {
  uploadEmployeeAvatar(
    employeeId: string,
    avatar: Express.Multer.File,
  ): Promise<CoreResponseDTO>;
  removeEmployeeAvatar(employeeId: string): Promise<CoreResponseDTO>;
}

export interface IImageEmployeeRpcController {
  uploadEmployeeAvatar(
    uploadEmployeeAvatarDTO: UploadEmployeeAvatarDTO,
  ): Promise<CoreResponseDTO>;
  removeEmployeeAvatar(employeeIdDTO: EmployeeIdDTO): Promise<CoreResponseDTO>;
}

export interface ISearchEmployeeController {
  searchEmployee(
    searchEmployeeDTO: SearchEmployeeDTO,
  ): Promise<SearchEmployeeResponseDTO[]>;
}

export interface ISearchEmployeeRpcController extends ISearchEmployeeController {}

export interface IUpdateEmployeeController {
  updateEmployeeInfo(
    employeeId: string,
    updateEmployeeInfoDTO: UpdateEmployeeInfoDTO,
  ): Promise<UpdateEmployeeInfoResponseDTO>;
}

export interface IUpdateEmployeeRpcController {
  updateEmployeeInfo(
    updateEmployeeInfoRequestDTO: UpdateEmployeeInfoRequestDTO,
  ): Promise<UpdateEmployeeInfoResponseDTO>;
}

export interface IUploadEmployeeController {
  uploadEmployeeResume(
    employeeId: string,
    resume: Express.Multer.File,
  ): Promise<CoreResponseDTO>;
  removeEmployeeResume(employeeId: string): Promise<CoreResponseDTO>;
  uploadEmployeeCoverLetter(
    employeeId: string,
    coverLetter: Express.Multer.File,
  ): Promise<CoreResponseDTO>;
  removeEmployeeCoverLetter(employeeId: string): Promise<CoreResponseDTO>;
}

export interface IUploadEmployeeRpcController {
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
    removeEmployeeEducationDTO: RemoveEmployeeEducationDTO,
  ): Promise<CoreResponseDTO>;
  removeEmployeeExperience(
    removeEmployeeExperienceDTO: RemoveEmployeeExperienceDTO,
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
