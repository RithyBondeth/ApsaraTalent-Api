import { ILinkedInAuthController } from '@app/contracts/interfaces/controller/auth-controller.interface';
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
import { LinkedInAuthGuard } from '../guards/linkedin-auth.guard';
import { SocialAuthService } from '../../services/social-auth.service';
import { LinkedInAuthDTO } from '@app/contracts';

@Controller('social/linkedin')
export class LinkedInController implements ILinkedInAuthController {
  constructor(private readonly socialAuthService: SocialAuthService) {}

  @Get('login')
  @HttpCode(HttpStatus.OK)
  @UseGuards(LinkedInAuthGuard)
  async linkedInAuth(): Promise<void> {}

  @Get('callback')
  @HttpCode(HttpStatus.OK)
  @UseGuards(LinkedInAuthGuard)
  async linkedInCallback(@Req() req: any, @Res() res: Response): Promise<void> {
    const linkedInDataDTO: LinkedInAuthDTO = {
      id: req.user.id,
      email: req.user.emails?.[0]?.value ?? null,
      firstName: req.user.name?.givenName ?? null,
      lastName: req.user.name?.familyName ?? null,
      picture: req.user.photos?.[0]?.value ?? null,
      provider: req.user.provider ?? null,
    };

    return this.socialAuthService.handleCallback({
      req,
      res,
      action: AUTH_SERVICE.ACTIONS.LINKEDIN_AUTH,
      payload: linkedInDataDTO,
      providerLabel: 'LinkedIn',
      successType: 'LINKEDIN_AUTH_SUCCESS',
      errorType: 'LINKEDIN_AUTH_ERROR',
      failureMessage: 'LinkedIn authentication failed',
    });
  }
}
