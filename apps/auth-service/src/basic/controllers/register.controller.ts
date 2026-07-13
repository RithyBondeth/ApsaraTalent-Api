import { IBasicAuthRegisterRpcController } from '@app/contracts/interfaces/controller/auth-controller.interface';
import { Controller, Inject } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { AUTH_SERVICE } from '@app/contracts/constants/service-actions/auth-service.constant';
import {
  I_REGISTER_SERVICE,
  IRegisterService,
} from '@app/contracts/interfaces/service/auth-service.interface';
import {
  CompanyRegisterDTO,
  CompanyRegisterResponseDTO,
  EmployeeRegisterDTO,
  EmployeeRegisterResponseDTO,
} from '@app/contracts';

@Controller()
export class RegisterController implements IBasicAuthRegisterRpcController {
  constructor(
    @Inject(I_REGISTER_SERVICE)
    private readonly registerService: IRegisterService,
  ) {}

  @MessagePattern(AUTH_SERVICE.ACTIONS.REGISTER_COMPANY)
  async registerCompany(
    @Payload() registerCompanyDTO: CompanyRegisterDTO,
  ): Promise<CompanyRegisterResponseDTO> {
    return this.registerService.companyRegister(registerCompanyDTO);
  }

  @MessagePattern(AUTH_SERVICE.ACTIONS.REGISTER_EMPLOYEE)
  async registerEmployee(
    @Payload() registerEmployeeDTO: EmployeeRegisterDTO,
  ): Promise<EmployeeRegisterResponseDTO> {
    return this.registerService.employeeRegister(registerEmployeeDTO);
  }
}
