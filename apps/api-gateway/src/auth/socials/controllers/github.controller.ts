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
import { Response } from 'express';
import { AUTH_SERVICE } from '@app/contracts/constants/service-actions/auth-service.constant';
import { GithubAuthGuard } from '../guards/github-auth.guard';
import { SocialAuthService } from '../../services/social-auth.service';

@Controller('social/github')
export class GithubController implements IGithubAuthController {
  constructor(private readonly socialAuthService: SocialAuthService) {}

  @Get('login')
  @HttpCode(HttpStatus.OK)
  @UseGuards(GithubAuthGuard)
  async githubAuth(@Query('remember') remember: string): Promise<void> {}

  @Get('callback')
  @HttpCode(HttpStatus.OK)
  @UseGuards(GithubAuthGuard)
  async githubCallback(@Req() req: any, @Res() res: Response): Promise<void> {
    return this.socialAuthService.handleCallback({
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
