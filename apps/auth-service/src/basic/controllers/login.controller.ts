import { IBasicAuthLoginController } from '@app/contracts/interfaces/auth-controller.interface';
import { Controller, Inject } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { AUTH_SERVICE } from '@app/contracts/constants/service-actions/auth-service.constant';
import { LoginResponseDTO } from '../dtos/login-response.dto';
import { LoginDTO } from '../dtos/login.dto';

import {
  I_LOGIN_SERVICE,
  ILoginService,
} from '@app/contracts/interfaces/auth-service.interface';

@Controller()
export class LoginController implements IBasicAuthLoginController {
  constructor(
    @Inject(I_LOGIN_SERVICE) private readonly loginService: ILoginService,
  ) {}

  @MessagePattern(AUTH_SERVICE.ACTIONS.LOGIN)
  async login(@Payload() loginDTO: LoginDTO): Promise<LoginResponseDTO> {
    return await this.loginService.login(loginDTO);
  }
}
