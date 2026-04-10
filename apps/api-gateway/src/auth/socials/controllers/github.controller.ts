import { IGithubAuthController } from '@app/contracts/interfaces/controller/auth-controller.interface';
import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientProxy } from '@nestjs/microservices';
import { Response } from 'express';
import { AUTH_SERVICE } from '@app/contracts/constants/service-actions/auth-service.constant';
import { GithubAuthGuard } from '../guards/github-auth.guard';
import { handleSocialAuthCallback } from '../shared/social-auth-callback.helper';

@Controller('social/github')
export class GithubController implements IGithubAuthController {
  constructor(
    @Inject(AUTH_SERVICE.NAME) private readonly authService: ClientProxy,
    private readonly configService: ConfigService,
  ) {}

  @Get('login')
  @HttpCode(HttpStatus.OK)
  @UseGuards(GithubAuthGuard)
  async githubAuth(@Query('remember') remember: string): Promise<void> {}

  @Get('callback')
  @HttpCode(HttpStatus.OK)
  @UseGuards(GithubAuthGuard)
  async githubCallback(@Req() req: any, @Res() res: Response): Promise<void> {
    return await handleSocialAuthCallback({
      authService: this.authService,
      configService: this.configService,
      req,
      res,
      action: AUTH_SERVICE.ACTIONS.GITHUB_AUTH,
      payload: req.user,
      providerLabel: 'GitHub',
      successType: 'GITHUB_AUTH_SUCCESS',
      errorType: 'GITHUB_AUTH_ERROR',
      failureMessage: 'GitHub authentication failed',
    });
  }
}
