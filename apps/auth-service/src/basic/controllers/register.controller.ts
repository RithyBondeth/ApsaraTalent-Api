import { Controller } from "@nestjs/common";
import { MessagePattern, Payload } from "@nestjs/microservices";
import { RegisterService } from "../services/register.service";
import { AUTH_SERVICE } from "utils/constants/auth-service.constant";
import { CompanyRegisterDTO } from "../dtos/company-register.dto";
import { EmployeeRegisterDTO } from "../dtos/employee-register.dto";
import { UserResponseDTO } from "apps/user-service/src/dtos/user-response.dto";
import { IBasicAuthRegisterController } from "@app/common/interfaces/auth-controller.interface";

@Controller()
export class RegisterController implements IBasicAuthRegisterController {
    constructor(private readonly registerService: RegisterService) {}

    @MessagePattern(AUTH_SERVICE.ACTIONS.REGISTER_COMPANY)
    async registerCompany(@Payload() registerCompany: CompanyRegisterDTO): Promise<{
        message: string;
        accessToken: string;
        refreshToken: string;
        user: UserResponseDTO;
    }> {
        return this.registerService.companyRegister(registerCompany);
    }

    @MessagePattern(AUTH_SERVICE.ACTIONS.REGISTER_EMPLOYEE) 
    async registerEmployee(@Payload() registerEmployeeDto: EmployeeRegisterDTO): Promise<{
        message: string;
        accessToken: string;
        refreshToken: string;
        user: UserResponseDTO;
    }> {
        return this.registerService.employeeRegitser(registerEmployeeDto);
    }
}