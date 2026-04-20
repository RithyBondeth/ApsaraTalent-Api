import { IBasicAuthVerifyEmailRpcController } from '@app/contracts/interfaces/controller/auth-controller.interface';
import { Controller, Inject } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { AUTH_SERVICE } from '@app/contracts/constants/service-actions/auth-service.constant';
import {
  I_VERIFY_EMAIL_SERVICE,
  IVerifyEmailService,
} from '@app/contracts/interfaces/service/auth-service.interface';
import { VerifyEmailDTO, VerifyEmailResponseDTO } from '@app/contracts';

@Controller()
export class VerifyEmailController implements IBasicAuthVerifyEmailRpcController {
  constructor(
    @Inject(I_VERIFY_EMAIL_SERVICE)
    private readonly verifyEmailService: IVerifyEmailService,
  ) {}

  @MessagePattern(AUTH_SERVICE.ACTIONS.VERIFY_EMAIL)
  async verifyEmail(
    @Payload() verifyEmailDTO: VerifyEmailDTO,
  ): Promise<VerifyEmailResponseDTO> {
    return this.verifyEmailService.verifyEmail(verifyEmailDTO);
  }
}
