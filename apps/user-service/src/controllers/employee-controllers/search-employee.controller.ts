import { ISearchEmployeeRpcController } from '@app/contracts/interfaces/controller/user-controllers/employee-controller.interface';
import { Controller, Inject } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { USER_SERVICE } from '@app/contracts/constants/service-actions/user-service.constant';
import {
  SearchEmployeeDTO,
  SearchEmployeeResponseDTO,
} from '@app/contracts/dtos/user';
import {
  I_SEARCH_EMPLOYEE_SERVICE,
  ISearchEmployeeService,
} from '@app/contracts/interfaces/service/user-service.interface';

@Controller()
export class SearchEmployeeController implements ISearchEmployeeRpcController {
  constructor(
    @Inject(I_SEARCH_EMPLOYEE_SERVICE)
    private readonly searchEmployeeService: ISearchEmployeeService,
  ) {}

  @MessagePattern(USER_SERVICE.ACTIONS.SEARCH_EMPLOYEES)
  async searchEmployee(
    @Payload() searchEmployeeDTO: SearchEmployeeDTO,
  ): Promise<SearchEmployeeResponseDTO[]> {
    return this.searchEmployeeService.searchEmployee(searchEmployeeDTO);
  }
}
