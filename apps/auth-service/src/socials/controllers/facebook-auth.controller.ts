import { Controller, Inject } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { AUTH_SERVICE } from '@app/contracts/constants/service-actions/auth-service.constant';
import { IFacebookAuthMicroserviceController } from '@app/contracts/interfaces/controller/auth-controller.interface';
import {
  I_FACEBOOK_AUTH_SERVICE,
  IFacebookAuthService,
} from '@app/contracts/interfaces/service/auth-service.interface';
import { FacebookAuthDTO, FacebookLoginResponseDTO } from '@app/contracts';

@Controller()
export class FacebookAuthController implements IFacebookAuthMicroserviceController {
  constructor(
    @Inject(I_FACEBOOK_AUTH_SERVICE)
    private readonly facebookAuthService: IFacebookAuthService,
  ) {}

  @MessagePattern(AUTH_SERVICE.ACTIONS.FACEBOOK_AUTH)
  async facebookAuth(
    @Payload() facebookDataDTO: FacebookAuthDTO,
  ): Promise<FacebookLoginResponseDTO> {
    return this.facebookAuthService.facebookLogin(facebookDataDTO);
  }
}
