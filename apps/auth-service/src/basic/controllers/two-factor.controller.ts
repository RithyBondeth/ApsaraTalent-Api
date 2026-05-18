import { Controller, Inject } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { AUTH_SERVICE } from '@app/contracts/constants/service-actions/auth-service.constant';
import {
  TwoFactorSetupDTO,
  TwoFactorSetupResponseDTO,
  TwoFactorEnableDTO,
  TwoFactorEnableResponseDTO,
  TwoFactorDisableDTO,
  TwoFactorDisableResponseDTO,
  TwoFactorVerifyLoginDTO,
  TwoFactorVerifyLoginResponseDTO,
} from '@app/contracts/dtos/auth';
import {
  I_TWO_FACTOR_SERVICE,
  ITwoFactorService,
} from '@app/contracts/interfaces/service/auth-service.interface';
import { IBasicAuthTwoFactorRpcController } from '@app/contracts';

@Controller()
export class TwoFactorController implements IBasicAuthTwoFactorRpcController {
  constructor(
    @Inject(I_TWO_FACTOR_SERVICE)
    private readonly twoFactorService: ITwoFactorService,
  ) {}

  @MessagePattern(AUTH_SERVICE.ACTIONS.TWO_FACTOR_SETUP)
  async twoFactorSetup(
    @Payload() twoFactorSetupDTO: TwoFactorSetupDTO,
  ): Promise<TwoFactorSetupResponseDTO> {
    return await this.twoFactorService.twoFactorSetup(twoFactorSetupDTO);
  }

  @MessagePattern(AUTH_SERVICE.ACTIONS.TWO_FACTOR_ENABLE)
  async twoFactorEnable(
    @Payload() twoFactorEnableDTO: TwoFactorEnableDTO,
  ): Promise<TwoFactorEnableResponseDTO> {
    return await this.twoFactorService.twoFactorEnable(twoFactorEnableDTO);
  }

  @MessagePattern(AUTH_SERVICE.ACTIONS.TWO_FACTOR_DISABLE)
  async twoFactorDisable(
    @Payload() twoFactorDisableDTO: TwoFactorDisableDTO,
  ): Promise<TwoFactorDisableResponseDTO> {
    return await this.twoFactorService.twoFactorDisable(twoFactorDisableDTO);
  }

  @MessagePattern(AUTH_SERVICE.ACTIONS.TWO_FACTOR_VERIFY_LOGIN)
  async twoFactorVerifyLogin(
    @Payload() twoFactorVerifyLoginDTO: TwoFactorVerifyLoginDTO,
  ): Promise<TwoFactorVerifyLoginResponseDTO> {
    return await this.twoFactorService.twoFactorVerifyLogin(
      twoFactorVerifyLoginDTO,
    );
  }
}
