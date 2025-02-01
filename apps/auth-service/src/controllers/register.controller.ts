import { Controller } from "@nestjs/common";
import { MessagePattern, Payload, RpcException } from "@nestjs/microservices";
import { RegisterService } from "../services/register.service";
import { RegisterDTO } from "../dtos/register.dto";
import { AUTH_SERVICE } from "@app/common/constants/auth-service.constant";

@Controller()
export class RegisterController {
    constructor(private readonly registerService: RegisterService) {}

    @MessagePattern(AUTH_SERVICE.ACTIONS.REGISTER)
    async register(@Payload() registerDto: RegisterDTO) {
        return await this.registerService.register(registerDto);
    }
} 