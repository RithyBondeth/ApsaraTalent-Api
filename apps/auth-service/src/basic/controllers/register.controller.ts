import { IBasicAuthRegisterController } from '@app/contracts/interfaces/controller/auth-controller.interface';
import { Controller, Inject } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { UserResponseDTO } from 'apps/user-service/src/dtos/user-response.dto';
import { AUTH_SERVICE } from '@app/contracts/constants/service-actions/auth-service.constant';
import { CompanyRegisterDTO } from '../dtos/company-register.dto';
import { EmployeeRegisterDTO } from '../dtos/employee-register.dto';

import {
  I_REGISTER_SERVICE,
  IRegisterService,
} from '@app/contracts/interfaces/service/auth-service.interface';

@Controller()
export class RegisterController implements IBasicAuthRegisterController {
  constructor(
    @Inject(I_REGISTER_SERVICE)
    private readonly registerService: IRegisterService,
  ) {}

  @MessagePattern(AUTH_SERVICE.ACTIONS.REGISTER_COMPANY)
  async registerCompany(
    @Payload() registerCompany: CompanyRegisterDTO,
  ): Promise<{
    message: string;
    accessToken: string;
    refreshToken: string;
    user: UserResponseDTO;
  }> {
    return this.registerService.companyRegister(registerCompany);
  }

  @MessagePattern(AUTH_SERVICE.ACTIONS.REGISTER_EMPLOYEE)
  async registerEmployee(
    @Payload() registerEmployeeDto: EmployeeRegisterDTO,
  ): Promise<{
    message: string;
    accessToken: string;
    refreshToken: string;
    user: UserResponseDTO;
  }> {
    return this.registerService.employeeRegister(registerEmployeeDto);
  }
}
