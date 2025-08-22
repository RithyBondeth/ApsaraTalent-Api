import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { AUTH_SERVICE } from 'utils/constants/auth-service.constant';
import { GoogleAuthGuard } from '../guards/google-auth.guard';
import { firstValueFrom } from 'rxjs';
import { IGoogleAuthController } from '@app/common/interfaces/auth-controller.interface';
import { Response } from 'express';
import { ConfigService } from '@nestjs/config';

@Controller('social')
export class GoogleController implements IGoogleAuthController {
  constructor(
    @Inject(AUTH_SERVICE.NAME) private readonly authService: ClientProxy,
    private readonly configService: ConfigService,
  ) {}

  @Get('google/login')
  @HttpCode(HttpStatus.OK)
  @UseGuards(GoogleAuthGuard)
  async googleAuth() {}

  @Get('google/callback')
  @HttpCode(HttpStatus.OK)
  @UseGuards(GoogleAuthGuard)
  async googleCallback(@Req() req: any, @Res() res: Response) {
    const result = await firstValueFrom(
      this.authService.send(AUTH_SERVICE.ACTIONS.GOOGLE_AUTH, req.user),
    );
    const FRONTEND_ORIGIN =
      this.configService.get<string>('FRONTED_ORIGIN') ??
      'http://localhost:4000';

    res.cookie('auth-token', result.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    });

    res.cookie('refresh-token', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    const html = `
        <!doctype html>
        <html>
        <body>
            <script>
            (function () {
                const data = ${JSON.stringify(result)};
                const targetOrigin = "${FRONTEND_ORIGIN}";

                // Send data to opener
                if (window.opener) {
                window.opener.postMessage(data, targetOrigin);
                }

                // Slight delay before closing to avoid COOP warnings
                setTimeout(() => {
                window.close();
                }, 100);
            })();
            </script>
        </body>
        </html>`;

    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  }
}
