import { ILinkedInAuthController } from '@app/contracts/interfaces/auth-controller.interface';
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
import { LinkedInAuthGuard } from '../guards/linkedin-auth.guard';
import { handleSocialAuthCallback } from '../utils/social-auth.util';

@Controller('social/linkedin')
export class LinkedInController implements ILinkedInAuthController {
  constructor(
    @Inject(AUTH_SERVICE.NAME) private readonly authService: ClientProxy,
    private readonly configService: ConfigService,
  ) {}

  @Get('login')
  @HttpCode(HttpStatus.OK)
  @UseGuards(LinkedInAuthGuard)
  async linkedInAuth(@Query('remember') remember: string): Promise<void> {}

  @Get('callback')
  @HttpCode(HttpStatus.OK)
  @UseGuards(LinkedInAuthGuard)
  async linkedInCallback(@Req() req: any, @Res() res: Response): Promise<void> {
    const linkedDataDTO = {
      id: req.user.id,
      email: req.user.emails?.[0]?.value ?? null,
      firstName: req.user.name?.givenName ?? null,
      lastName: req.user.name?.familyName ?? null,
      picture: req.user.photos?.[0]?.value ?? null,
      provider: req.user.provider ?? null,
    };

    return await handleSocialAuthCallback({
      authService: this.authService,
      configService: this.configService,
      req,
      res,
      action: AUTH_SERVICE.ACTIONS.LINKEDIN_AUTH,
      payload: linkedDataDTO,
      providerLabel: 'LinkedIn',
      successType: 'LINKEDIN_AUTH_SUCCESS',
      errorType: 'LINKEDIN_AUTH_ERROR',
      failureMessage: 'LinkedIn authentication failed',
    });
  }
}
