import { PaginationDTO } from '@app/contracts/dtos/shared';
import {
  CountAllUsersResponseDTO,
  EmployeeIdDTO,
  EmployeeResponseDTO,
  RemoveEmployeeAvatarResponseDTO,
  RemoveEmployeeCoverLetterResponseDTO,
  RemoveEmployeeEducationDTO,
  RemoveEmployeeEducationResponseDTO,
  RemoveEmployeeExperienceDTO,
  RemoveEmployeeExperienceResponseDTO,
  RemoveEmployeeResumeResponseDTO,
  SearchEmployeeDTO,
  SearchEmployeeResponseDTO,
  UpdateEmployeeInfoDTO,
  UpdateEmployeeInfoRequestDTO,
  UpdateEmployeeInfoResponseDTO,
  UploadEmployeeAvatarDTO,
  UploadEmployeeAvatarResponseDTO,
  UploadEmployeeCoverLetterDTO,
  UploadEmployeeCoverLetterResponseDTO,
  UploadEmployeeResumeDTO,
  UploadEmployeeResumeResponseDTO,
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
  ): Promise<UploadEmployeeAvatarResponseDTO>;
  removeEmployeeAvatar(
    employeeId: string,
  ): Promise<RemoveEmployeeAvatarResponseDTO>;
}

export interface IImageEmployeeRpcController {
  uploadEmployeeAvatar(
    uploadEmployeeAvatarDTO: UploadEmployeeAvatarDTO,
  ): Promise<UploadEmployeeAvatarResponseDTO>;
  removeEmployeeAvatar(
    employeeIdDTO: EmployeeIdDTO,
  ): Promise<RemoveEmployeeAvatarResponseDTO>;
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
  ): Promise<UploadEmployeeResumeResponseDTO>;
  removeEmployeeResume(
    employeeId: string,
  ): Promise<RemoveEmployeeResumeResponseDTO>;
  uploadEmployeeCoverLetter(
    employeeId: string,
    coverLetter: Express.Multer.File,
  ): Promise<UploadEmployeeCoverLetterResponseDTO>;
  removeEmployeeCoverLetter(
    employeeId: string,
  ): Promise<RemoveEmployeeCoverLetterResponseDTO>;
}

export interface IUploadEmployeeRpcController {
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

export interface IRemoveEmployeeItemsController {
  removeEmployeeEducation(
    employeeId: string,
    educationId: string,
  ): Promise<RemoveEmployeeEducationResponseDTO>;
  removeEmployeeExperience(
    employeeId: string,
    experienceId: string,
  ): Promise<RemoveEmployeeExperienceResponseDTO>;
}

export interface IRemoveEmployeeItemsRpcController {
  removeEmployeeEducation(
    removeEmployeeEducationDTO: RemoveEmployeeEducationDTO,
  ): Promise<RemoveEmployeeEducationResponseDTO>;
  removeEmployeeExperience(
    removeEmployeeExperienceDTO: RemoveEmployeeExperienceDTO,
  ): Promise<RemoveEmployeeExperienceResponseDTO>;
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
