import { IImageEmployeeRpcController } from '@app/contracts/interfaces/controller/user-controllers/employee-controller.interface';
import { Controller, Inject } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { USER_SERVICE } from '@app/contracts/constants/service-actions/user-service.constant';
import {
  I_IMAGE_EMPLOYEE_SERVICE,
  IImageEmployeeService,
} from '@app/contracts/interfaces/service/user-service.interface';
import {
  EmployeeIdDTO,
  RemoveEmployeeAvatarResponseDTO,
  UploadEmployeeAvatarDTO,
  UploadEmployeeAvatarResponseDTO,
} from '@app/contracts/dtos/user';

@Controller()
export class ImageEmployeeController implements IImageEmployeeRpcController {
  constructor(
    @Inject(I_IMAGE_EMPLOYEE_SERVICE)
    private readonly imageEmployeeService: IImageEmployeeService,
  ) {}

  @MessagePattern(USER_SERVICE.ACTIONS.UPLOAD_EMPLOYEE_AVATAR)
  async uploadEmployeeAvatar(
    @Payload() uploadEmployeeAvatarDTO: UploadEmployeeAvatarDTO,
  ): Promise<UploadEmployeeAvatarResponseDTO> {
    return this.imageEmployeeService.uploadEmployeeAvatar(
      uploadEmployeeAvatarDTO,
    );
  }

  @MessagePattern(USER_SERVICE.ACTIONS.REMOVE_EMPLOYEE_AVATAR)
  async removeEmployeeAvatar(
    @Payload() employeeIdDTO: EmployeeIdDTO,
  ): Promise<RemoveEmployeeAvatarResponseDTO> {
    return this.imageEmployeeService.removeEmployeeAvatar(employeeIdDTO);
  }
}
