import { IGoogleAuthController } from '@app/contracts/interfaces/controller/auth-controller.interface';
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
import { GoogleAuthGuard } from '../guards/google-auth.guard';
import { handleSocialAuthCallback } from '../shared/social-auth-callback.helper';

@Controller('social/google')
export class GoogleController implements IGoogleAuthController {
  constructor(
    @Inject(AUTH_SERVICE.NAME) private readonly authService: ClientProxy,
    private readonly configService: ConfigService,
  ) {}

  @Get('login')
  @HttpCode(HttpStatus.OK)
  @UseGuards(GoogleAuthGuard)
  async googleAuth(@Query('remember') remember: string): Promise<void> {}

  @Get('callback')
  @HttpCode(HttpStatus.OK)
  @UseGuards(GoogleAuthGuard)
  async googleCallback(@Req() req: any, @Res() res: Response): Promise<void> {
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
