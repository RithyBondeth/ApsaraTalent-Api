import { IUpdateEmployeeController } from '@app/common/interfaces/employee-controller.interface';
import { Controller, Inject } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { USER_SERVICE } from 'utils/constants/user-service.constant';
import { UpdateEmployeeInfoDTO } from '../../dtos/employee/update-employee-info.dto';
import { UpdateEmployeeInfoService } from '../../services/employee-services/update-employee-info.service';

import {
  I_UPDATE_EMPLOYEE_INFO_SERVICE,
  IUpdateEmployeeInfoService,
} from '@app/common/interfaces/user-service.interface';

@Controller()
export class UpdateEmployeeInfoController implements IUpdateEmployeeController {
  constructor(
    @Inject(I_UPDATE_EMPLOYEE_INFO_SERVICE)
    private readonly updateEmployeeInfoService: IUpdateEmployeeInfoService,
  ) {}

  @MessagePattern(USER_SERVICE.ACTIONS.UPDATE_EMPLOYEE_INFO)
  async updateEmployeeInfo(
    @Payload()
    payload: {
      updateEmployeeInfoDTO: UpdateEmployeeInfoDTO;
      employeeId: string;
    },
  ) {
    return this.updateEmployeeInfoService.updateEmployeeInfo(
      payload.updateEmployeeInfoDTO,
      payload.employeeId,
    );
  }
}
