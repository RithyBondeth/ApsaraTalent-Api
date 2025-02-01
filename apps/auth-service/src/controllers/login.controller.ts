import { Controller } from "@nestjs/common";
import { LoginService } from "../services/login.service";

@Controller()
export class LoginController {
    constructor(private readonly loginService: LoginService) {}
}