import { Body, Controller, HttpCode, Post, Res } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches } from 'class-validator';
import { Response } from 'express';
import { SocialAuthService } from '../../services/social-auth.service';

export class MobileOAuthExchangeDTO {
  @ApiProperty()
  @IsString()
  @Matches(/^[A-Za-z0-9_-]{43}$/)
  code: string;

  @ApiProperty()
  @IsString()
  @Matches(/^[A-Za-z0-9._~-]{43,128}$/)
  codeVerifier: string;
}

@Controller('social/mobile')
export class MobileOAuthController {
  constructor(private readonly social: SocialAuthService) {}

  @Post('exchange')
  @HttpCode(200)
  exchange(
    @Body() dto: MobileOAuthExchangeDTO,
    @Res({ passthrough: true }) res: Response,
  ) {
    res.setHeader('Cache-Control', 'no-store');
    return this.social.exchangeNativeCode(dto.code, dto.codeVerifier, res);
  }
}
