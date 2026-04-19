import { IBasicAuthLoginRpcController } from '@app/contracts/interfaces/controller/auth-controller.interface';
import { Controller, Inject } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { AUTH_SERVICE } from '@app/contracts/constants/service-actions/auth-service.constant';
import {
  I_LOGIN_SERVICE,
  ILoginService,
} from '@app/contracts/interfaces/service/auth-service.interface';
import { LoginDTO, LoginResponseDTO } from '@app/contracts';

@Controller()
export class LoginController implements IBasicAuthLoginRpcController {
  constructor(
    @Inject(I_LOGIN_SERVICE) private readonly loginService: ILoginService,
  ) {}

  @MessagePattern(AUTH_SERVICE.ACTIONS.LOGIN)
  async login(@Payload() loginDTO: LoginDTO): Promise<LoginResponseDTO> {
    return await this.loginService.login(loginDTO);
  }
}
