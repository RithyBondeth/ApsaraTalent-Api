import { IBasicAuthRefreshTokenController } from '@app/common/interfaces/auth-controller.interface';
import { Controller, Inject } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { AUTH_SERVICE } from 'utils/constants/auth-service.constant';
import { RefreshTokenDTO } from '../dtos/refresh-token.dto';
import { RefreshTokenService } from '../services/refresh-token.service';

import {
  I_REFRESH_TOKEN_SERVICE,
  IRefreshTokenService,
} from '@app/common/interfaces/auth-service.interface';

@Controller()
export class RefreshTokenController implements IBasicAuthRefreshTokenController {
  constructor(
    @Inject(I_REFRESH_TOKEN_SERVICE)
    private readonly refreshTokenService: IRefreshTokenService,
  ) {}

  @MessagePattern(AUTH_SERVICE.ACTIONS.REFRESH_TOKEN)
  async refreshToken(@Payload() refreshTokenDTO: RefreshTokenDTO) {
    return this.refreshTokenService.refreshToken(refreshTokenDTO);
  }
}
