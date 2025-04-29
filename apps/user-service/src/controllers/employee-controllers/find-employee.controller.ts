import { Controller } from "@nestjs/common";
import { FindEmployeeService } from "../../services/employee-services/find-employee.service";
import { MessagePattern, Payload } from "@nestjs/microservices";
import { USER_SERVICE } from "utils/constants/user-service.constant";
import { UserPaginationDTO } from "../../dtos/user-pagination.dto";

@Controller()
export class FindEmployeeController {
    constructor(private readonly findEmployeeService: FindEmployeeService) {}

    @MessagePattern(USER_SERVICE.ACTIONS.FIND_ALL_EMPLOYEE) 
    async findAll(@Payload() payload: { pagination: UserPaginationDTO }) {
        return this.findEmployeeService.findAll(payload.pagination);
    }

    @MessagePattern(USER_SERVICE.ACTIONS.FIND_ONE_EMPLOYEE_BY_ID)
    async findOne(@Payload() payload: { employeeId: string }) {
        return this.findEmployeeService.findOneById(payload.employeeId);
    }
}