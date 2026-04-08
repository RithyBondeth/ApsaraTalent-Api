import { IBasicAuthVerifyEmailController } from '@app/common/interfaces/auth-controller.interface';
import { Controller, Inject } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { AUTH_SERVICE } from 'utils/constants/auth-service.constant';
import { VerifyEmailResponseDTO } from '../dtos/verify-email-response.dto';
import { VerifyEmailService } from '../services/verify-email.service';

import {
  I_VERIFY_EMAIL_SERVICE,
  IVerifyEmailService,
} from '@app/common/interfaces/auth-service.interface';

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
