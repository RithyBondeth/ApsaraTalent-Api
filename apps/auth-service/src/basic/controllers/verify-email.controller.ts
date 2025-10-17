import { Controller } from '@nestjs/common';
import { VerifyEmailService } from '../services/verify-email.service';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { AUTH_SERVICE } from 'utils/constants/auth-service.constant';
import { VerifyEmailResponseDTO } from '../dtos/verify-email-response.dto';
import { IBasicAuthVerifyEmailController } from '@app/common/interfaces/auth-controller.interface';

@Controller()
export class VerifyEmailController implements IBasicAuthVerifyEmailController {
  constructor(private readonly verifyEmailService: VerifyEmailService) {}

  @MessagePattern(AUTH_SERVICE.ACTIONS.VERIFY_EMAIL)
  async verifyEmail(
    @Payload() emailVerificationToken: string,
  ): Promise<VerifyEmailResponseDTO> {
    return this.verifyEmailService.verifyEmail(emailVerificationToken);
  }
}
