import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Req,
  Res,
  UseGuards,
  BadRequestException,
  Query,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { AUTH_SERVICE } from 'utils/constants/auth-service.constant';
import { GoogleAuthGuard } from '../guards/google-auth.guard';
import { firstValueFrom, timeout } from 'rxjs';
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
  async googleAuth(@Query('remember') remember: string) {
    // Passport automatically redirects to Google
    // GoogleAuthGuard saves remember flag for callback
  }

  @Get('google/callback')
  @HttpCode(HttpStatus.OK)
  @UseGuards(GoogleAuthGuard)
  async googleCallback(@Req() req: any, @Res() res: Response) {
    try {
      const remember = req.session.remember;

      const result = await firstValueFrom(
        this.authService
          .send(AUTH_SERVICE.ACTIONS.GOOGLE_AUTH, req.user)
          .pipe(timeout(10000)),
      );

      if (!result?.accessToken) {
        throw new BadRequestException('Authentication failed');
      }

      // Determine frontend URL
      const FRONTEND_ORIGIN = this.configService.get<string>('frontend.origin');

      const isProduction =
        this.configService.get<string>('NODE_ENV') === 'production';

      // Cookie expiration based on remember flag
      const maxAge = remember
        ? 30 * 24 * 60 * 60 * 1000 // 30 days
        : 24 * 60 * 60 * 1000; // 1 day

      // Secure cookie options
      const cookieOptions = {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax' as const,
        maxAge,
        path: '/',
      };

      // Set secure cookies
      res.cookie('auth-token', result.accessToken, cookieOptions);

      if (result.refreshToken) {
        res.cookie('refresh-token', result.refreshToken, cookieOptions);
      }

      // Store remember flag (frontend needs this)
      res.cookie('auth-remember', remember ? 'true' : 'false', {
        httpOnly: false,
        secure: isProduction,
        sameSite: 'lax',
        maxAge,
        path: '/',
      });

      // Send user info using postMessage (no tokens)
      const html = `
        <!doctype html>
        <html>
        <body>
          <script>
            (function () {
              const targetOrigin = "${FRONTEND_ORIGIN}";
              const message = {
                type: 'GOOGLE_AUTH_SUCCESS',
                newUser: ${JSON.stringify(result.newUser)},
                user: {
                  email: ${JSON.stringify(result.email)},
                  firstname: ${JSON.stringify(result.firstname)},
                  lastname: ${JSON.stringify(result.lastname)},
                  picture: ${JSON.stringify(result.picture)},
                  role: ${JSON.stringify(result.role)},
                  provider: ${JSON.stringify(result.provider)},
                  lastLoginMethod: ${JSON.stringify(result.lastLoginMethod)},
                  lastLoginAt: ${JSON.stringify(result.lastLoginAt)}
                }
              };
              
              if (window.opener && !window.opener.closed) {
                window.opener.postMessage(message, targetOrigin);
                setTimeout(() => window.close(), 100);
              } else {
                window.location.href = targetOrigin + '/feed';
              }
            })();
          </script>
        </body>
        </html>`;

      res.setHeader('Content-Type', 'text/html');
      res.send(html);
    } catch (error) {
      console.error('Google authentication error:', error);

      const FRONTEND_ORIGIN = this.configService.get<string>('frontend.origin');

      const errorHtml = `
        <!doctype html>
        <html>
        <body>
          <script>
            (function () {
              const targetOrigin = "${FRONTEND_ORIGIN}";
              const message = {
                type: 'GOOGLE_AUTH_ERROR',
                error: 'Authentication failed.'
              };
              
              if (window.opener && !window.opener.closed) {
                window.opener.postMessage(message, targetOrigin);
                setTimeout(() => window.close(), 100);
              } else {
                window.location.href = targetOrigin + '/login?error=auth_failed';
              }
            })();
          </script>
        </body>
        </html>`;

      res.setHeader('Content-Type', 'text/html');
      res.status(HttpStatus.UNAUTHORIZED).send(errorHtml);
    }
  }
}
