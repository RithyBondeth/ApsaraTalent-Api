import { IFacebookAuthController } from '@app/contracts/interfaces/auth-controller.interface';
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
import { FacebookAuthGuard } from '../guards/facebook-auth.guard';
import { handleSocialAuthCallback } from '../utils/social-auth.util';

@Controller('social/facebook')
export class FacebookController implements IFacebookAuthController {
  constructor(
    @Inject(AUTH_SERVICE.NAME) private readonly authService: ClientProxy,
    private readonly configService: ConfigService,
  ) {}

  @Get('login')
  @HttpCode(HttpStatus.OK)
  @UseGuards(FacebookAuthGuard)
  async facebookAuth(@Query('remember') remember: string) {
    // Passport automatically redirects to Facebook
    // FacebookAuthGuard saves remember flag for callback
  }

  @Get('callback')
  @HttpCode(HttpStatus.OK)
  @UseGuards(FacebookAuthGuard)
  async facebookCallback(@Req() req: any, @Res() res: Response) {
    return await handleSocialAuthCallback({
      authService: this.authService,
      configService: this.configService,
      req,
      res,
      action: AUTH_SERVICE.ACTIONS.FACEBOOK_AUTH,
      payload: req.user,
      providerLabel: 'Facebook',
      successType: 'FACEBOOK_AUTH_SUCCESS',
      errorType: 'FACEBOOK_AUTH_ERROR',
      failureMessage: 'Facebook authentication failed',
    });
  }
}
