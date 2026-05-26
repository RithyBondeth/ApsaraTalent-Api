import { IUpdateEmployeeRpcController } from '@app/contracts/interfaces/controller/user-controllers/employee-controller.interface';
import { Controller, Inject } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { USER_SERVICE } from '@app/contracts/constants/service-actions/user-service.constant';
import {
  UpdateEmployeeInfoRpcDTO,
  UpdateEmployeeInfoResponseDTO,
} from '@app/contracts/dtos/user';
import {
  I_UPDATE_EMPLOYEE_INFO_SERVICE,
  IUpdateEmployeeInfoService,
} from '@app/contracts/interfaces/service/user-service.interface';

@Controller()
export class UpdateEmployeeInfoController implements IUpdateEmployeeRpcController {
  constructor(
    @Inject(I_UPDATE_EMPLOYEE_INFO_SERVICE)
    private readonly updateEmployeeInfoService: IUpdateEmployeeInfoService,
  ) {}

  @MessagePattern(USER_SERVICE.ACTIONS.UPDATE_EMPLOYEE_INFO)
  async updateEmployeeInfo(
    @Payload() updateEmployeeInfoRpcDTO: UpdateEmployeeInfoRpcDTO,
  ): Promise<UpdateEmployeeInfoResponseDTO> {
    return this.updateEmployeeInfoService.updateEmployeeInfo(
      updateEmployeeInfoRpcDTO,
    );
  }
}
