import { IGoogleAuthController } from '@app/contracts/interfaces/controller/auth-controller.interface';
import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';

import { Response } from 'express';
import { AUTH_SERVICE } from '@app/contracts/constants/service-actions/auth-service.constant';
import { GoogleAuthGuard } from '../guards/google-auth.guard';
import { SocialAuthService } from '../../services/social-auth.service';

@Controller('social/google')
export class GoogleController implements IGoogleAuthController {
  constructor(private readonly socialAuthService: SocialAuthService) {}

  @Get('login')
  @HttpCode(HttpStatus.OK)
  @UseGuards(GoogleAuthGuard)
  async googleAuth(): Promise<void> {}

  @Get('callback')
  @HttpCode(HttpStatus.OK)
  @UseGuards(GoogleAuthGuard)
  async googleCallback(@Req() req: any, @Res() res: Response): Promise<void> {
    return this.socialAuthService.handleCallback({
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
