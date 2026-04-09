import { IGoogleAuthController } from '@app/contracts/interfaces/auth-controller.interface';
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
import { AUTH_SERVICE } from '@app/contracts/constants/auth-service.constant';
import { GoogleAuthGuard } from '../guards/google-auth.guard';
import { handleSocialAuthCallback } from '../utils/social-auth.util';

@Controller('social/google')
export class GoogleController implements IGoogleAuthController {
  constructor(
    @Inject(AUTH_SERVICE.NAME) private readonly authService: ClientProxy,
    private readonly configService: ConfigService,
  ) {}

  @Get('login')
  @HttpCode(HttpStatus.OK)
  @UseGuards(GoogleAuthGuard)
  async googleAuth(@Query('remember') remember: string) {
    // Passport automatically redirects to Google
    // GoogleAuthGuard saves remember flag for callback.
  }

  @Get('callback')
  @HttpCode(HttpStatus.OK)
  @UseGuards(GoogleAuthGuard)
  async googleCallback(@Req() req: any, @Res() res: Response) {
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
      failureMessage: 'Google authentication failed',
    });
  }
}
