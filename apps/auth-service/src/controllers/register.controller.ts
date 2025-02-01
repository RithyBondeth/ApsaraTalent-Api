import { Controller } from "@nestjs/common";
import { MessagePattern, Payload, RpcException } from "@nestjs/microservices";
import { RegisterService } from "../services/register.service";
import { RegisterDTO } from "../dtos/register.dto";
import { AUTH_SERVICE } from "utils/constants/auth-service.constant";
import { RegisterReponseDTO } from "../dtos/register-response.dto";

@Controller()
export class RegisterController {
    constructor(private readonly registerService: RegisterService) {}

    @MessagePattern(AUTH_SERVICE.ACTIONS.REGISTER)
    async register(@Payload() registerDto: RegisterDTO): Promise<RegisterReponseDTO> {
        return await this.registerService.register(registerDto);
    }
} 