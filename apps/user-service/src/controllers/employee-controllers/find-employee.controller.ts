import { Controller } from "@nestjs/common";
import { FindEmployeeService } from "../../services/employee-services/find-employee.service";
import { MessagePattern, Payload } from "@nestjs/microservices";
import { USER_SERVICE } from "utils/constants/user-service.constant";

@Controller()
export class FindEmployeeController {
    constructor(private readonly findEmployeeService: FindEmployeeService) {}

    @MessagePattern(USER_SERVICE.ACTIONS.FIND_ALL_EMPLOYEE) 
    async findAll() {
        return this.findEmployeeService.findAll();
    }

    @MessagePattern(USER_SERVICE.ACTIONS.FIND_ONE_EMPLOYEE_BYID)
    async findOne(@Payload() payload: { employeeId: string }) {
        return this.findEmployeeService.findOneById(payload.employeeId);
    }
}