import { Controller, Inject } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { AUTH_SERVICE } from '@app/contracts/constants/service-actions/auth-service.constant';
import { GithubAuthDTO } from '../dtos/github-auth.dto';

import { IGithubAuthMicroserviceController } from '@app/contracts/interfaces/auth-controller.interface';

import {
  I_GITHUB_AUTH_SERVICE,
  IGithubAuthService,
} from '@app/contracts/interfaces/auth-service.interface';

@Controller()
export class GithubAuthController implements IGithubAuthMicroserviceController {
  constructor(
    @Inject(I_GITHUB_AUTH_SERVICE)
    private readonly githubAuthService: IGithubAuthService,
  ) {}

  @MessagePattern(AUTH_SERVICE.ACTIONS.GITHUB_AUTH)
  async githubAuth(@Payload() githubData: GithubAuthDTO) {
    return this.githubAuthService.githubLogin(githubData);
  }
}
