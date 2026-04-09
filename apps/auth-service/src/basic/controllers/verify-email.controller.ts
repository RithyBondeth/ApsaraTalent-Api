import { IBasicAuthVerifyEmailController } from '@app/contracts/interfaces/auth-controller.interface';
import { Controller, Inject } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { AUTH_SERVICE } from '@app/contracts/constants/auth-service.constant';
import { VerifyEmailResponseDTO } from '../dtos/verify-email-response.dto';

import {
  I_VERIFY_EMAIL_SERVICE,
  IVerifyEmailService,
} from '@app/contracts/interfaces/auth-service.interface';

@Controller()
export class VerifyEmailController implements IBasicAuthVerifyEmailController {
  constructor(
    @Inject(I_VERIFY_EMAIL_SERVICE)
    private readonly verifyEmailService: IVerifyEmailService,
  ) {}

  @MessagePattern(AUTH_SERVICE.ACTIONS.VERIFY_EMAIL)
  async verifyEmail(
    @Payload() emailVerificationToken: string,
  ): Promise<VerifyEmailResponseDTO> {
    return this.verifyEmailService.verifyEmail(emailVerificationToken);
  }
}
