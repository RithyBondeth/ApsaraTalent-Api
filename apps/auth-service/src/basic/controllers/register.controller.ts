import { Controller } from "@nestjs/common";
import { MessagePattern, Payload } from "@nestjs/microservices";
import { RegisterService } from "../services/register.service";
import { AUTH_SERVICE } from "utils/constants/auth-service.constant";
import { CompanyRegisterDTO } from "../dtos/company-register.dto";
import { EmployeeRegisterDTO } from "../dtos/employee-register.dto";

@Controller()
export class RegisterController {
    constructor(private readonly registerService: RegisterService) {}

    @MessagePattern(AUTH_SERVICE.ACTIONS.REGISTER_COMPANY)
    async testAuth() {
        return "Hi from Auth Service";
    }

    @MessagePattern(AUTH_SERVICE.ACTIONS.REGISTER_EMPLOYEE) 
    async registerEmployee(@Payload() registerEmployeeDto: EmployeeRegisterDTO) {
        return this.registerService.employeeRegitser(registerEmployeeDto);
    }
}