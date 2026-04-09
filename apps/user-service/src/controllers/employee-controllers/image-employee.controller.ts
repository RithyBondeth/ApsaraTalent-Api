import { IImageEmployeeController } from '@app/contracts/interfaces/employee-controller.interface';
import { Controller, Inject } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { USER_SERVICE } from '@app/contracts/constants/user-service.constant';
import {
  I_IMAGE_EMPLOYEE_SERVICE,
  IImageEmployeeService,
} from '@app/contracts/interfaces/user-service.interface';

@Controller()
export class ImageEmployeeController implements IImageEmployeeController {
  constructor(
    @Inject(I_IMAGE_EMPLOYEE_SERVICE)
    private readonly imageEmployeeService: IImageEmployeeService,
  ) {}

  @MessagePattern(USER_SERVICE.ACTIONS.UPLOAD_EMPLOYEE_AVATAR)
  async uploadEmployeeAvatar(
    @Payload() payload: { employeeId: string; avatar: Express.Multer.File },
  ) {
    return this.imageEmployeeService.uploadEmployeeAvatar(
      payload.employeeId,
      payload.avatar,
    );
  }

  @MessagePattern(USER_SERVICE.ACTIONS.REMOVE_EMPLOYEE_AVATAR)
  async removeEmployeeAvatar(@Payload() payload: { employeeId: string }) {
    return this.imageEmployeeService.removeEmployeeAvatar(payload.employeeId);
  }
}
