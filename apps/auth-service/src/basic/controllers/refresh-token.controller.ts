import { IBasicAuthRefreshTokenController } from '@app/contracts/interfaces/auth-controller.interface';
import { Controller, Inject } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { AUTH_SERVICE } from '@app/contracts/constants/auth-service.constant';
import { RefreshTokenDTO } from '../dtos/refresh-token.dto';

import {
  I_REFRESH_TOKEN_SERVICE,
  IRefreshTokenService,
} from '@app/contracts/interfaces/auth-service.interface';

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
