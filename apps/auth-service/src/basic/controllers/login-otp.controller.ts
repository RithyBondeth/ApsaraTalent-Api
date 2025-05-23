import { Controller } from "@nestjs/common";
import { MessagePattern, Payload } from "@nestjs/microservices";
import { AUTH_SERVICE } from "utils/constants/auth-service.constant";
import { LoginOtpDTO } from "../dtos/login-otp.dto";
import { LoginOTPService } from "../services/login-otp.service";

@Controller()
export class LoginOTPController {
    constructor(private readonly loginOtpService: LoginOTPService) {} 
    
    @MessagePattern(AUTH_SERVICE.ACTIONS.LOGIN_OTP)
    async loginOtp(@Payload() loginOtpOTP: LoginOtpDTO): Promise<any> {
        return this.loginOtpService.loginOtp(loginOtpOTP);
    }
}
