import { Controller, Inject } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { AUTH_SERVICE } from '@app/contracts/constants/service-actions/auth-service.constant';
import { LinkedInAuthDTO } from '../dtos/linkedin-auth.dto';

import { ILinkedInAuthMicroserviceController } from '@app/contracts/interfaces/controller/auth-controller.interface';

import {
  I_LINKEDIN_AUTH_SERVICE,
  ILinkedInAuthService,
} from '@app/contracts/interfaces/service/auth-service.interface';

@Controller()
export class LinkedInAuthController implements ILinkedInAuthMicroserviceController {
  constructor(
    @Inject(I_LINKEDIN_AUTH_SERVICE)
    private readonly linkedInService: ILinkedInAuthService,
  ) {}

  @MessagePattern(AUTH_SERVICE.ACTIONS.LINKEDIN_AUTH)
  async linkedInAuth(@Payload() linkedInData: LinkedInAuthDTO) {
    return this.linkedInService.linkedInLogin(linkedInData);
  }
}
