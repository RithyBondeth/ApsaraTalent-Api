import { IImageEmployeeRpcController } from '@app/contracts/interfaces/controller/employee-controller.interface';
import { Controller, Inject } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { USER_SERVICE } from '@app/contracts/constants/service-actions/user-service.constant';
import {
  I_IMAGE_EMPLOYEE_SERVICE,
  IImageEmployeeService,
} from '@app/contracts/interfaces/service/user-service.interface';
import {
  EmployeeIdDTO,
  UploadEmployeeAvatarDTO,
} from '@app/contracts/dtos/user';
import { CoreResponseDTO } from '@app/contracts/dtos/shared';

@Controller()
export class ImageEmployeeController implements IImageEmployeeRpcController {
  constructor(
    @Inject(I_IMAGE_EMPLOYEE_SERVICE)
    private readonly imageEmployeeService: IImageEmployeeService,
  ) {}

  @MessagePattern(USER_SERVICE.ACTIONS.UPLOAD_EMPLOYEE_AVATAR)
  async uploadEmployeeAvatar(
    @Payload() uploadEmployeeAvatarDTO: UploadEmployeeAvatarDTO,
  ): Promise<CoreResponseDTO> {
    return this.imageEmployeeService.uploadEmployeeAvatar(
      uploadEmployeeAvatarDTO,
    );
  }

  @MessagePattern(USER_SERVICE.ACTIONS.REMOVE_EMPLOYEE_AVATAR)
  async removeEmployeeAvatar(
    @Payload() employeeIdDTO: EmployeeIdDTO,
  ): Promise<CoreResponseDTO> {
    return this.imageEmployeeService.removeEmployeeAvatar(employeeIdDTO);
  }
}
