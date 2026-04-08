import { ISearchEmployeeController } from '@app/common/interfaces/employee-controller.interface';
import { Controller, Inject } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { USER_SERVICE } from 'utils/constants/user-service.constant';
import { SearchEmployeeDto } from '../../dtos/employee/search-employee.dto';
import { EmployeeResponseDTO } from '../../dtos/user-response.dto';
import { SearchEmployeeService } from '../../services/employee-services/search-employee.service';

import {
  I_SEARCH_EMPLOYEE_SERVICE,
  ISearchEmployeeService,
} from '@app/common/interfaces/user-service.interface';

@Controller()
export class SearchEmployeeController implements ISearchEmployeeController {
  constructor(
    @Inject(I_SEARCH_EMPLOYEE_SERVICE)
    private readonly searchEmployeeService: ISearchEmployeeService,
  ) {}

  @MessagePattern(USER_SERVICE.ACTIONS.SEARCH_EMPLOYEES)
  async searchEmployee(
    @Payload() searchEmployeeQuery: SearchEmployeeDto,
  ): Promise<EmployeeResponseDTO[]> {
    return this.searchEmployeeService.searchEmployee(searchEmployeeQuery);
  }
}
