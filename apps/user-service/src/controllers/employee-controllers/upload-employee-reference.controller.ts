import { IUploadEmployeeRpcController } from '@app/contracts/interfaces/controller/employee-controller.interface';
import { Controller, Inject } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { USER_SERVICE } from '@app/contracts/constants/service-actions/user-service.constant';
import {
  I_UPLOAD_EMPLOYEE_REFERENCE_SERVICE,
  IUploadEmployeeReferenceService,
} from '@app/contracts/interfaces/service/user-service.interface';
import {
  EmployeeIdDTO,
  RemoveEmployeeCoverLetterResponseDTO,
  RemoveEmployeeResumeResponseDTO,
  UploadEmployeeCoverLetterDTO,
  UploadEmployeeCoverLetterResponseDTO,
  UploadEmployeeResumeDTO,
  UploadEmployeeResumeResponseDTO,
} from '@app/contracts/dtos/user';

@Controller()
export class UploadEmployeeReferenceController implements IUploadEmployeeRpcController {
  constructor(
    @Inject(I_UPLOAD_EMPLOYEE_REFERENCE_SERVICE)
    private readonly uploadEmployeeReferenceService: IUploadEmployeeReferenceService,
  ) {}

  @MessagePattern(USER_SERVICE.ACTIONS.UPLOAD_EMPLOYEE_RESUME)
  async uploadEmployeeResume(
    @Payload() uploadEmployeeResumeDTO: UploadEmployeeResumeDTO,
  ): Promise<UploadEmployeeResumeResponseDTO> {
    return this.uploadEmployeeReferenceService.uploadEmployeeResume(
      uploadEmployeeResumeDTO,
    );
  }

  @MessagePattern(USER_SERVICE.ACTIONS.REMOVE_EMPLOYEE_RESUME)
  async removeEmployeeResume(
    @Payload() employeeIdDTO: EmployeeIdDTO,
  ): Promise<RemoveEmployeeResumeResponseDTO> {
    return this.uploadEmployeeReferenceService.removeEmployeeResume(
      employeeIdDTO,
    );
  }

  @MessagePattern(USER_SERVICE.ACTIONS.UPLOAD_EMPLOYEE_COVER_LETTER)
  async uploadEmployeeCoverLetter(
    @Payload() uploadEmployeeCoverLetterDTO: UploadEmployeeCoverLetterDTO,
  ): Promise<UploadEmployeeCoverLetterResponseDTO> {
    return this.uploadEmployeeReferenceService.uploadEmployeeCoverLetter(
      uploadEmployeeCoverLetterDTO,
    );
  }

  @MessagePattern(USER_SERVICE.ACTIONS.REMOVE_EMPLOYEE_COVER_LETTER)
  async removeEmployeeCoverLetter(
    @Payload() employeeIdDTO: EmployeeIdDTO,
  ): Promise<RemoveEmployeeCoverLetterResponseDTO> {
    return this.uploadEmployeeReferenceService.removeEmployeeCoverLetter(
      employeeIdDTO,
    );
  }
}
