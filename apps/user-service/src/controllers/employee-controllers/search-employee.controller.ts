import { Controller } from "@nestjs/common";
import { MessagePattern, Payload } from "@nestjs/microservices";
import { USER_SERVICE } from "utils/constants/user-service.constant";
import { SearchEmployeeDto } from "../../dtos/employee/search-employee.dto";
import { SearchEmployeeService } from "../../services/employee-services/search-employee.service";
import { EmployeeResponseDTO } from "../../dtos/user-response.dto";
import { ISearchEmployeeController } from "@app/common/interfaces/employee-controller.interface";

@Controller()
export class SearchEmployeeController implements ISearchEmployeeController {
    constructor(private readonly searchEmployeeService: SearchEmployeeService) {}

    @MessagePattern(USER_SERVICE.ACTIONS.SEARCH_EMPLOYEES) 
    async searchEmployee(@Payload() searchEmployeeQuery: SearchEmployeeDto): Promise<EmployeeResponseDTO[]> {
        return this.searchEmployeeService.searchEmployee(searchEmployeeQuery);
    }  
}