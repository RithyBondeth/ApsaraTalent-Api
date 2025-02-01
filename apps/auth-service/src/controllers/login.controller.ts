import { Controller } from "@nestjs/common";
import { LoginService } from "../services/login.service";
import { MessagePattern, Payload } from "@nestjs/microservices";
import { AUTH_SERVICE } from "utils/constants/auth-service.constant";
import { LoginDTO } from "../dtos/login.dto";
import { LoginResponseDTO } from "../dtos/login-response.dto";

@Controller()
export class LoginController {
    constructor(private readonly loginService: LoginService) {}

    @MessagePattern(AUTH_SERVICE.ACTIONS.LOGIN)
    async login(@Payload() loginDTO: LoginDTO): Promise<LoginResponseDTO> {
        return await this.loginService.login(loginDTO);
    }
}