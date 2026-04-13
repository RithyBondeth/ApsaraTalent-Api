import { Controller, Inject } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { AUTH_SERVICE } from '@app/contracts/constants/service-actions/auth-service.constant';
import { IGithubAuthMicroserviceController } from '@app/contracts/interfaces/controller/auth-controller.interface';
import {
  I_GITHUB_AUTH_SERVICE,
  IGithubAuthService,
} from '@app/contracts/interfaces/service/auth-service.interface';
import { GithubAuthDTO, GithubLoginResponseDTO } from '@app/contracts';

@Controller()
export class GithubAuthController implements IGithubAuthMicroserviceController {
  constructor(
    @Inject(I_GITHUB_AUTH_SERVICE)
    private readonly githubAuthService: IGithubAuthService,
  ) {}

  @MessagePattern(AUTH_SERVICE.ACTIONS.GITHUB_AUTH)
  async githubAuth(
    @Payload() githubData: GithubAuthDTO,
  ): Promise<GithubLoginResponseDTO> {
    return this.githubAuthService.githubLogin(githubData);
  }
}
