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
