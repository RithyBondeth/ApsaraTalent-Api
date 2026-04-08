import { Controller, Inject } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { AUTH_SERVICE } from '@app/contracts/constants/auth-service.constant';
import { GoogleAuthDTO } from '../dtos/google-auth.dto';
import { GoogleAuthService } from '../services/google-auth.service';

import { IGoogleAuthMicroserviceController } from '@app/contracts/interfaces/auth-controller.interface';

import {
  I_GOOGLE_AUTH_SERVICE,
  IGoogleAuthService,
} from '@app/contracts/interfaces/auth-service.interface';

@Controller()
export class GoogleAuthController implements IGoogleAuthMicroserviceController {
  constructor(
    @Inject(I_GOOGLE_AUTH_SERVICE)
    private readonly googleAuthService: IGoogleAuthService,
  ) {}

  @MessagePattern(AUTH_SERVICE.ACTIONS.GOOGLE_AUTH)
  async googleAuth(@Payload() googleData: GoogleAuthDTO) {
    return this.googleAuthService.googleLogin(googleData);
  }
}
