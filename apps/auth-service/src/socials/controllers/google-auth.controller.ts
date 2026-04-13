import { Controller, Inject } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { AUTH_SERVICE } from '@app/contracts/constants/service-actions/auth-service.constant';
import { IGoogleAuthMicroserviceController } from '@app/contracts/interfaces/controller/auth-controller.interface';
import {
  I_GOOGLE_AUTH_SERVICE,
  IGoogleAuthService,
} from '@app/contracts/interfaces/service/auth-service.interface';
import { GoogleAuthDTO, GoogleLoginResponseDTO } from '@app/contracts';

@Controller()
export class GoogleAuthController implements IGoogleAuthMicroserviceController {
  constructor(
    @Inject(I_GOOGLE_AUTH_SERVICE)
    private readonly googleAuthService: IGoogleAuthService,
  ) {}

  @MessagePattern(AUTH_SERVICE.ACTIONS.GOOGLE_AUTH)
  async googleAuth(
    @Payload() googleData: GoogleAuthDTO,
  ): Promise<GoogleLoginResponseDTO> {
    return this.googleAuthService.googleLogin(googleData);
  }
}
