import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { USER_SERVICE } from 'utils/constants/user-service.constant';
import { UploadEmployeeAvatarService } from '../../services/employee-services/upload-employee-avatar.service';

@Controller()
export class UploadEmployeeAvatarController {
  constructor(private readonly uploadEmployeeAvatarService: UploadEmployeeAvatarService) {}

  @MessagePattern(USER_SERVICE.ACTIONS.UPLOAD_EMPLOYEE_AVATAR)
  async uploadEmployeeAvatar(@Payload() payload: any) {
    return this.uploadEmployeeAvatarService.uploadEmployeeAvatar(payload.employeeId, payload.avatar);
  }
}
