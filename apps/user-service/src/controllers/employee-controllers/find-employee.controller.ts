import { IFindEmployeeController } from '@app/contracts/interfaces/employee-controller.interface';
import { Controller, Inject } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { USER_SERVICE } from '@app/contracts/constants/user-service.constant';
import { UserPaginationDTO } from '../../dtos/user-pagination.dto';
import {
  CountAllUsersResponseDTO,
  EmployeeResponseDTO,
} from '../../dtos/user-response.dto';
import {
  I_FIND_EMPLOYEE_SERVICE,
  IFindEmployeeService,
} from '@app/contracts/interfaces/user-service.interface';

@Controller()
export class FindEmployeeController implements IFindEmployeeController {
  constructor(
    @Inject(I_FIND_EMPLOYEE_SERVICE)
    private readonly findEmployeeService: IFindEmployeeService,
  ) {}

  @MessagePattern(USER_SERVICE.ACTIONS.FIND_ALL_EMPLOYEE)
  async findAll(
    @Payload() payload: { pagination: UserPaginationDTO },
  ): Promise<EmployeeResponseDTO[]> {
    return this.findEmployeeService.findAll(payload.pagination);
  }

  @MessagePattern(USER_SERVICE.ACTIONS.COUNT_ALL_EMPLOYEE)
  async countAllEmployees(): Promise<CountAllUsersResponseDTO> {
    return this.findEmployeeService.countAllEmployees();
  }

  @MessagePattern(USER_SERVICE.ACTIONS.FIND_ONE_EMPLOYEE_BY_ID)
  async findOneById(
    @Payload() payload: { employeeId: string },
  ): Promise<EmployeeResponseDTO> {
    return this.findEmployeeService.findOneById(payload.employeeId);
  }
}
