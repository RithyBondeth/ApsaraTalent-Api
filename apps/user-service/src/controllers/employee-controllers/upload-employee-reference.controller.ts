import { IUploadEmployeeController } from '@app/common/interfaces/employee-controller.interface';
import { Controller, Inject } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { USER_SERVICE } from 'utils/constants/user-service.constant';
import { UploadEmployeeReferenceService } from '../../services/employee-services/upload-employee-reference.service';
import {
  I_UPLOAD_EMPLOYEE_REFERENCE_SERVICE,
  IUploadEmployeeReferenceService,
} from '@app/common/interfaces/user-service.interface';

@Controller()
export class UploadEmployeeReferenceController implements IUploadEmployeeController {
  constructor(
    @Inject(I_UPLOAD_EMPLOYEE_REFERENCE_SERVICE)
    private readonly uploadEmployeeReferenceService: IUploadEmployeeReferenceService,
  ) {}

  @MessagePattern(USER_SERVICE.ACTIONS.UPLOAD_EMPLOYEE_RESUME)
  async uploadEmployeeResume(
    @Payload() payload: { employeeId: string; resume: Express.Multer.File },
  ) {
    return this.uploadEmployeeReferenceService.uploadEmployeeResume(
      payload.employeeId,
      payload.resume,
    );
  }

  @MessagePattern(USER_SERVICE.ACTIONS.REMOVE_EMPLOYEE_RESUME)
  async removeEmployeeResume(@Payload() payload: { employeeId: string }) {
    return this.uploadEmployeeReferenceService.removeEmployeeResume(
      payload.employeeId,
    );
  }

  @MessagePattern(USER_SERVICE.ACTIONS.UPLOAD_EMPLOYEE_COVER_LETTER)
  async uploadEmployeeCoverLetter(
    @Payload()
    payload: {
      employeeId: string;
      coverLetter: Express.Multer.File;
    },
  ) {
    return this.uploadEmployeeReferenceService.uploadEmployeeCoverLetter(
      payload.employeeId,
      payload.coverLetter,
    );
  }

  @MessagePattern(USER_SERVICE.ACTIONS.REMOVE_EMPLOYEE_COVER_LETTER)
  async removeEmployeeCoverLetter(@Payload() payload: { employeeId: string }) {
    return this.uploadEmployeeReferenceService.removeEmployeeCoverLetter(
      payload.employeeId,
    );
  }
}
