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
  UploadEmployeeCoverLetterDTO,
  UploadEmployeeResumeDTO,
} from '@app/contracts/dtos/user';
import { CoreResponseDTO } from '@app/contracts/dtos/shared';

@Controller()
export class UploadEmployeeReferenceController implements IUploadEmployeeRpcController {
  constructor(
    @Inject(I_UPLOAD_EMPLOYEE_REFERENCE_SERVICE)
    private readonly uploadEmployeeReferenceService: IUploadEmployeeReferenceService,
  ) {}

  @MessagePattern(USER_SERVICE.ACTIONS.UPLOAD_EMPLOYEE_RESUME)
  async uploadEmployeeResume(
    @Payload() payload: UploadEmployeeResumeDTO,
  ): Promise<CoreResponseDTO> {
    return this.uploadEmployeeReferenceService.uploadEmployeeResume(payload);
  }

  @MessagePattern(USER_SERVICE.ACTIONS.REMOVE_EMPLOYEE_RESUME)
  async removeEmployeeResume(
    @Payload() payload: EmployeeIdDTO,
  ): Promise<CoreResponseDTO> {
    return this.uploadEmployeeReferenceService.removeEmployeeResume(payload);
  }

  @MessagePattern(USER_SERVICE.ACTIONS.UPLOAD_EMPLOYEE_COVER_LETTER)
  async uploadEmployeeCoverLetter(
    @Payload() payload: UploadEmployeeCoverLetterDTO,
  ): Promise<CoreResponseDTO> {
    return this.uploadEmployeeReferenceService.uploadEmployeeCoverLetter(
      payload,
    );
  }

  @MessagePattern(USER_SERVICE.ACTIONS.REMOVE_EMPLOYEE_COVER_LETTER)
  async removeEmployeeCoverLetter(
    @Payload() payload: EmployeeIdDTO,
  ): Promise<CoreResponseDTO> {
    return this.uploadEmployeeReferenceService.removeEmployeeCoverLetter(
      payload,
    );
  }
}
