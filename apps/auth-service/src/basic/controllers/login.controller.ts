<<<<<<< HEAD
import { Controller } from "@nestjs/common";
import { LoginService } from "../services/login.service";
import { MessagePattern, Payload } from "@nestjs/microservices";
import { AUTH_SERVICE } from "utils/constants/auth-service.constant";
import { LoginDTO } from "../dtos/login.dto";
import { LoginResponseDTO } from "../dtos/login-response.dto";
import { IBasicAuthLoginController } from "@app/common/interfaces/auth-controller.interface";

@Controller()
export class LoginController implements  IBasicAuthLoginController {
    constructor(private readonly loginService: LoginService) {}

    @MessagePattern(AUTH_SERVICE.ACTIONS.LOGIN)
    async login(@Payload() loginDTO: LoginDTO): Promise<LoginResponseDTO> {
        return await this.loginService.login(loginDTO);
    }
}
=======
import { IBasicAuthLoginController } from '@app/common/interfaces/auth-controller.interface';
import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { AUTH_SERVICE } from 'utils/constants/auth-service.constant';
import { LoginResponseDTO } from '../dtos/login-response.dto';
import { LoginDTO } from '../dtos/login.dto';
import { LoginService } from '../services/login.service';

@Controller()
export class LoginController implements IBasicAuthLoginController {
  constructor(private readonly loginService: LoginService) {}

  @MessagePattern(AUTH_SERVICE.ACTIONS.LOGIN)
  async login(@Payload() loginDTO: LoginDTO): Promise<LoginResponseDTO> {
    return await this.loginService.login(loginDTO);
  }
}
>>>>>>> c4eaba4638ff660126b81b33f459ea47796036af
