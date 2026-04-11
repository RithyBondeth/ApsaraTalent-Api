import { IImageEmployeeController } from '@app/contracts/interfaces/controller/employee-controller.interface';
import { Controller, Inject } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { USER_SERVICE } from '@app/contracts/constants/service-actions/user-service.constant';
import {
  I_IMAGE_EMPLOYEE_SERVICE,
  IImageEmployeeService,
} from '@app/contracts/interfaces/service/user-service.interface';
import { MessageResponse } from '@app/contracts/interfaces/domain/message-response.interface';

@Controller()
export class ImageEmployeeController implements IImageEmployeeController {
  constructor(
    @Inject(I_IMAGE_EMPLOYEE_SERVICE)
    private readonly imageEmployeeService: IImageEmployeeService,
  ) {}

  @MessagePattern(USER_SERVICE.ACTIONS.UPLOAD_EMPLOYEE_AVATAR)
  async uploadEmployeeAvatar(
    @Payload() payload: { employeeId: string; avatar: Express.Multer.File },
  ): Promise<MessageResponse> {
    return this.imageEmployeeService.uploadEmployeeAvatar(
      payload.employeeId,
      payload.avatar,
    );
  }

  @MessagePattern(USER_SERVICE.ACTIONS.REMOVE_EMPLOYEE_AVATAR)
  async removeEmployeeAvatar(
    @Payload() payload: { employeeId: string },
  ): Promise<MessageResponse> {
    return this.imageEmployeeService.removeEmployeeAvatar(payload.employeeId);
  }
}
