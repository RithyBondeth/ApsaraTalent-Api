import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { USER_SERVICE } from 'utils/constants/user-service.constant';
import { ImageEmployeeService } from '../../services/employee-services/image-employee.service';
import { IImageEmployeeController } from '@app/common/interfaces/employee-controller.interface';

@Controller()
export class ImageEmployeeController implements IImageEmployeeController {
  constructor(private readonly imageEmployeeService: ImageEmployeeService) {}

  @MessagePattern(USER_SERVICE.ACTIONS.UPLOAD_EMPLOYEE_AVATAR)
  async uploadEmployeeAvatar(
    @Payload() payload: { employeeId: string; avatar: Express.Multer.File },
  ) {
    console.log(payload.avatar);
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
