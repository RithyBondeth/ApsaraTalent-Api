import { IFacebookAuthController } from '@app/contracts/interfaces/controller/auth-controller.interface';
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
import { FacebookAuthGuard } from '../guards/facebook-auth.guard';
import { SocialAuthService } from '../../services/social-auth.service';

@Controller('social/facebook')
export class FacebookController implements IFacebookAuthController {
  constructor(private readonly socialAuthService: SocialAuthService) {}

  @Get('login')
  @HttpCode(HttpStatus.OK)
  @UseGuards(FacebookAuthGuard)
  async facebookAuth(): Promise<void> {}

  @Get('callback')
  @HttpCode(HttpStatus.OK)
  @UseGuards(FacebookAuthGuard)
  async facebookCallback(@Req() req: any, @Res() res: Response): Promise<void> {
    return this.socialAuthService.handleCallback({
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
