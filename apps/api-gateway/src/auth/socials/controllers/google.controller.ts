import { IGoogleAuthController } from '@app/common/interfaces/auth-controller.interface';
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
import { GoogleAuthGuard } from '../guards/google-auth.guard';
import { handleSocialAuthCallback } from '../utils/social-auth.util';

@Controller('social')
export class GoogleController implements IGoogleAuthController {
  constructor(
    @Inject(AUTH_SERVICE.NAME) private readonly authService: ClientProxy,
    private readonly configService: ConfigService,
  ) {}

  @Get('google/login')
  @HttpCode(HttpStatus.OK)
  @UseGuards(GoogleAuthGuard)
  async googleAuth(@Query('remember') remember: string) {
    // Passport immediately redirects to Google; the guard also persists the
    // "remember me" choice in session so the callback can reuse it.
  }

  @Get('google/callback')
  @HttpCode(HttpStatus.OK)
  @UseGuards(GoogleAuthGuard)
  async googleCallback(@Req() req: any, @Res() res: Response) {
    // The gateway only owns the OAuth redirect ceremony. Real account lookup,
    // token issuance, and signup-vs-login decisions happen in auth-service.
    return await handleSocialAuthCallback({
      authService: this.authService,
      configService: this.configService,
      req,
      res,
      action: AUTH_SERVICE.ACTIONS.GOOGLE_AUTH,
      payload: req.user,
      providerLabel: 'Google',
      successType: 'GOOGLE_AUTH_SUCCESS',
      errorType: 'GOOGLE_AUTH_ERROR',
      failureMessage: 'Authentication failed',
    });
  }
}
