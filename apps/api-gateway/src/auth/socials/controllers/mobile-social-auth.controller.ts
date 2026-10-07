import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { IsString, Matches } from 'class-validator';
import { Response } from 'express';
import { SocialAuthService } from '../../services/social-auth.service';
import { setAuthTokenCookies } from '../../utils/auth-cookie.util';
import { AUTH } from '@app/contracts/constants/domain/auth.constant';
import { isProductionEnvironment } from '../../utils/auth-cookie.util';

class MobileOAuthExchangeDTO {
  @IsString()
  @Matches(/^[A-Za-z0-9_-]{43}$/)
  code: string;
}

@Controller('social/mobile')
export class MobileSocialAuthController {
  constructor(private readonly socialAuthService: SocialAuthService) {}

  @Post('exchange')
  @HttpCode(HttpStatus.OK)
  async exchange(
    @Body() body: MobileOAuthExchangeDTO,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ message: string }> {
    const exchange = await this.socialAuthService.exchangeMobileCode(body.code);
    if (!exchange) {
      throw new UnauthorizedException('This social sign-in has expired');
    }

    setAuthTokenCookies(res, {
      accessToken: exchange.accessToken,
      refreshToken: exchange.refreshToken,
      accessMaxAge: exchange.remember
        ? AUTH.REMEMBER_ME_MAXAGE
        : AUTH.TOKEN_MAXAGE,
      refreshMaxAge: exchange.remember
        ? AUTH.REMEMBER_ME_MAXAGE
        : AUTH.TOKEN_MAXAGE,
      isProduction: isProductionEnvironment(),
    });
    return { message: 'Social sign-in successful' };
  }
}
