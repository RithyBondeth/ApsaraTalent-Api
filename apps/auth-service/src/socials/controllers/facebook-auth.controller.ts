import { Controller, Inject } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { AUTH_SERVICE } from 'utils/constants/auth-service.constant';
import { FacebookAuthDTO } from '../dtos/facebook-auth.dto';
import { FacebookAuthService } from '../services/facebook-auth.service';

import { IFacebookAuthMicroserviceController } from '@app/common/interfaces/auth-controller.interface';

import {
  I_FACEBOOK_AUTH_SERVICE,
  IFacebookAuthService,
} from '@app/common/interfaces/auth-service.interface';

@Controller()
export class FacebookAuthController implements IFacebookAuthMicroserviceController {
  constructor(
    @Inject(I_FACEBOOK_AUTH_SERVICE)
    private readonly facebookAuthService: IFacebookAuthService,
  ) {}

  @MessagePattern(AUTH_SERVICE.ACTIONS.FACEBOOK_AUTH)
  async facebookAuth(@Payload() facebookDataDTO: FacebookAuthDTO) {
    return this.facebookAuthService.facebookLogin(facebookDataDTO);
  }
}
