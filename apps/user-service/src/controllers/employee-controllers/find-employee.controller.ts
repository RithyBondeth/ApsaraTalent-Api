import { IFindEmployeeController } from '@app/common/interfaces/employee-controller.interface';
import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { USER_SERVICE } from 'utils/constants/user-service.constant';
import { UserPaginationDTO } from '../../dtos/user-pagination.dto';
import { EmployeeResponseDTO } from '../../dtos/user-response.dto';
import { FindEmployeeService } from '../../services/employee-services/find-employee.service';

@Controller()
export class FindEmployeeController implements IFindEmployeeController {
  constructor(private readonly findEmployeeService: FindEmployeeService) {}

  @MessagePattern(USER_SERVICE.ACTIONS.FIND_ALL_EMPLOYEE)
  async findAll(
    @Payload() payload: { pagination: UserPaginationDTO },
  ): Promise<EmployeeResponseDTO[]> {
    return this.findEmployeeService.findAll(payload.pagination);
  }

  @MessagePattern(USER_SERVICE.ACTIONS.FIND_ONE_EMPLOYEE_BY_ID)
  async findOneById(
    @Payload() payload: { employeeId: string },
  ): Promise<EmployeeResponseDTO> {
    return this.findEmployeeService.findOneById(payload.employeeId);
  }
}
