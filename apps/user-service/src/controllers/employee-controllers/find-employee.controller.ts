import { IFindEmployeeRpcController } from '@app/contracts/interfaces/controller/employee-controller.interface';
import { Controller, Inject } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { USER_SERVICE } from '@app/contracts/constants/service-actions/user-service.constant';
import {
  CountAllUsersResponseDTO,
  EmployeeResponseDTO,
  EmployeeIdDTO,
} from '@app/contracts/dtos/user';
import { PaginationDTO } from '@app/contracts/dtos/shared';
import {
  I_FIND_EMPLOYEE_SERVICE,
  IFindEmployeeService,
} from '@app/contracts/interfaces/service/user-service.interface';

@Controller()
export class FindEmployeeController implements IFindEmployeeRpcController {
  constructor(
    @Inject(I_FIND_EMPLOYEE_SERVICE)
    private readonly findEmployeeService: IFindEmployeeService,
  ) {}

  @MessagePattern(USER_SERVICE.ACTIONS.FIND_ALL_EMPLOYEE)
  async findAll(
    @Payload() payload: PaginationDTO,
  ): Promise<EmployeeResponseDTO[]> {
    return this.findEmployeeService.findAll(payload);
  }

  @MessagePattern(USER_SERVICE.ACTIONS.COUNT_ALL_EMPLOYEE)
  async countAllEmployees(): Promise<CountAllUsersResponseDTO> {
    return this.findEmployeeService.countAllEmployees();
  }

  @MessagePattern(USER_SERVICE.ACTIONS.FIND_ONE_EMPLOYEE_BY_ID)
  async findOneById(
    @Payload() payload: EmployeeIdDTO,
  ): Promise<EmployeeResponseDTO> {
    return this.findEmployeeService.findOneById(payload);
  }
}
