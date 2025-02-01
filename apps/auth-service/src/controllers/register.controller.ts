import { Controller } from "@nestjs/common";
import { MessagePattern } from "@nestjs/microservices";
import { RegisterService } from "../services/register.service";
import { RegisterDTO } from "../dtos/register.dto";
import { AUTH_SERVICE } from "@app/common/constants/auth-service.constant";

@Controller()
export class RegisterController {
    constructor(private readonly registerService: RegisterService) {}

    @MessagePattern({ cmd: AUTH_SERVICE.ACTIONS.REGISTER })
    async register(registerDTO: RegisterDTO) {
        return this.registerService.register(registerDTO);
    }
}  