<<<<<<< HEAD
import { Controller } from "@nestjs/common";
import { RefreshTokenService } from "../services/refresh-token.service";
import { MessagePattern, Payload } from "@nestjs/microservices";
import { AUTH_SERVICE } from "utils/constants/auth-service.constant";
import { RefreshTokenDTO } from "../dtos/refresh-token.dto";
import { IBasicAuthRefreshTokenController } from "@app/common/interfaces/auth-controller.interface";

@Controller()
export class RefreshTokenController implements IBasicAuthRefreshTokenController {
    constructor(private readonly refreshTokenService: RefreshTokenService) {}
    
    @MessagePattern(AUTH_SERVICE.ACTIONS.REFRESH_TOKEN)
    async refreshToken(@Payload() refreshTokenDTO: RefreshTokenDTO) {
        return this.refreshTokenService.refreshToken(refreshTokenDTO);
    }
}
=======
import { IBasicAuthRefreshTokenController } from '@app/common/interfaces/auth-controller.interface';
import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { AUTH_SERVICE } from 'utils/constants/auth-service.constant';
import { RefreshTokenDTO } from '../dtos/refresh-token.dto';
import { RefreshTokenService } from '../services/refresh-token.service';

@Controller()
export class RefreshTokenController implements IBasicAuthRefreshTokenController {
  constructor(private readonly refreshTokenService: RefreshTokenService) {}

  @MessagePattern(AUTH_SERVICE.ACTIONS.REFRESH_TOKEN)
  async refreshToken(@Payload() refreshTokenDTO: RefreshTokenDTO) {
    return this.refreshTokenService.refreshToken(refreshTokenDTO);
  }
}
>>>>>>> c4eaba4638ff660126b81b33f459ea47796036af
