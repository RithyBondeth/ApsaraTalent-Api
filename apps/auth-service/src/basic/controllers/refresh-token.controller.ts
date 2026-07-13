import { IBasicAuthRefreshTokenRpcController } from '@app/contracts/interfaces/controller/auth-controller.interface';
import { Controller, Inject } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { AUTH_SERVICE } from '@app/contracts/constants/service-actions/auth-service.constant';
import {
  I_REFRESH_TOKEN_SERVICE,
  IRefreshTokenService,
} from '@app/contracts/interfaces/service/auth-service.interface';
import { RefreshTokenDTO, RefreshTokenResponseDTO } from '@app/contracts';

@Controller()
export class RefreshTokenController implements IBasicAuthRefreshTokenRpcController {
  constructor(
    @Inject(I_REFRESH_TOKEN_SERVICE)
    private readonly refreshTokenService: IRefreshTokenService,
  ) {}

  @MessagePattern(AUTH_SERVICE.ACTIONS.REFRESH_TOKEN)
  async refreshToken(
    @Payload() refreshTokenDTO: RefreshTokenDTO,
  ): Promise<RefreshTokenResponseDTO> {
    return this.refreshTokenService.refreshToken(refreshTokenDTO);
  }
}
