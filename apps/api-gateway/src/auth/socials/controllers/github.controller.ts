import { IGithubAuthController } from '@app/common/interfaces/auth-controller.interface';
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
import { AUTH_SERVICE } from 'utils/constants/auth-service.constant';
import { GithubAuthGuard } from '../guards/github-auth.guard';
import { handleSocialAuthCallback } from '../utils/social-auth.util';

@Controller('social')
export class GithubController implements IGithubAuthController {
  constructor(
    @Inject(AUTH_SERVICE.NAME) private readonly authService: ClientProxy,
    private readonly configService: ConfigService,
  ) {}

  @Get('github/login')
  @HttpCode(HttpStatus.OK)
  @UseGuards(GithubAuthGuard)
  async githubAuth(@Query('remember') remember: string) {
    // Passport automatically redirects to Github
    // GithubAuthGuard saves remember flag for callback
  }

  @Get('github/callback')
  @HttpCode(HttpStatus.OK)
  @UseGuards(GithubAuthGuard)
  async githubCallback(@Req() req: any, @Res() res: Response) {
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
