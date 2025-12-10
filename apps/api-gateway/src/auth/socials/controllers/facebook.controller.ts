import { IFacebookAuthController } from '@app/common/interfaces/auth-controller.interface';
import {
  BadRequestException,
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
import { FacebookAuthGuard } from '../guards/facebook-auth.guard';
import { Response } from 'express';
import { firstValueFrom, timeout } from 'rxjs';
import { AUTH_SERVICE } from 'utils/constants/auth-service.constant';
import { ClientProxy } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';

@Controller('social')
export class FacebookController implements IFacebookAuthController {
  constructor(
    @Inject(AUTH_SERVICE.NAME) private readonly authService: ClientProxy,
    private readonly configService: ConfigService,
  ) {}

  @Get('facebook/login')
  @HttpCode(HttpStatus.OK)
  @UseGuards(FacebookAuthGuard)
  async facebookAuth(@Query('remember') remember: string) {
    // Passport automatically redirects to Facebook
    // FacebookAuthGuard saves remember flag for callback
  }

  @Get('facebook/callback')
  @HttpCode(HttpStatus.OK)
  @UseGuards(FacebookAuthGuard)
  async facebookCallback(@Req() req: any, @Res() res: Response) {
    try {
      const remember = req.remember === true;

      const result = await firstValueFrom(
        this.authService
          .send(AUTH_SERVICE.ACTIONS.FACEBOOK_AUTH, req.user)
          .pipe(timeout(10000)),
      );

      if (!result?.accessToken) {
        throw new BadRequestException('Facebook authentication failed');
      }

      // Determine frontend URL
      const FRONTEND_ORIGIN =
        this.configService.get<string>('FRONTEND_ORIGIN') ??
        'http://localhost:4000';

      const isProduction =
        this.configService.get<string>('NODE_ENV') === 'production';

      // Cookie expiration based on remember flag
      const maxAge = remember
        ? 30 * 24 * 60 * 60 * 1000 // 30 days
        : 24 * 60 * 60 * 1000; // 1 day

      // Secure cookie options
      const cookieOptions = {
        httpOnly: true, // Prevents JavaScript access
        secure: isProduction,
        sameSite: 'lax' as const, // 'lax' is better for OAuth redirects
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        path: '/',
      };

      // Set secure cookie
      res.cookie('auth-token', result.accessToken, cookieOptions);

      if (result.refreshToken) {
        res.cookie('refresh-token', result.refreshToken, cookieOptions);
      }

      // Store remember flag (frontend needs this)
      res.cookie('auth-remember', remember ? 'true' : 'false', {
        httpOnly: false, // Frontend needs to read this
        secure: isProduction,
        sameSite: 'lax' as const,
        maxAge: 30 * 24 * 60 * 60 * 1000,
        path: '/',
      });

      // Send user info using postMessage (no tokens)
      const html = `
        <!doctype html>
        <html>
        <head>
          <title>Authentication Successful</title>
        </head>
        <body>
          <script>
            (function () {
              const targetOrigin = "${FRONTEND_ORIGIN}";
              
              // Only send user data and flags, NEVER tokens
              const message = {
                type: 'FACEBOOK_AUTH_SUCCESS', // Fixed: was 'FACEBOOK_AUTH_'
                newUser: ${result.newUser || false},
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
                
                // Close after a short delay
                setTimeout(() => {
                  try {
                    window.close();
                  } catch (e) {
                    console.debug('Could not close popup:', e);
                  }
                }, 100);
              } else {
                // Fallback: redirect to frontend if no opener
                window.location.href = targetOrigin + '/feed';
              }
            })();
          </script>
          <noscript>
            <p>Authentication successful. Redirecting...</p>
            <meta http-equiv="refresh" content="0;url=${FRONTEND_ORIGIN}/feed">
          </noscript>
        </body>
        </html>`;

      res.setHeader('Content-Type', 'text/html');
      res.send(html);
    } catch (error) {
      console.error('Facebook authentication error:', error);

      const FRONTEND_ORIGIN =
        this.configService.get<string>('FRONTEND_ORIGIN') ??
        'http://localhost:4000';

      const errorHtml = `
        <!doctype html>
        <html>
        <head>
          <title>Authentication Failed</title>
        </head>
        <body>
          <script>
            (function () {
              const targetOrigin = "${FRONTEND_ORIGIN}";
              const message = {
                type: 'FACEBOOK_AUTH_ERROR',
                error: 'Authentication failed. Please try again.'
              };
              
              if (window.opener && !window.opener.closed) {
                window.opener.postMessage(message, targetOrigin);
                setTimeout(() => window.close(), 100);
              } else {
                window.location.href = targetOrigin + '/login?error=auth_failed';
              }
            })();
          </script>
          <noscript>
            <p>Authentication failed. Redirecting...</p>
            <meta http-equiv="refresh" content="0;url=${FRONTEND_ORIGIN}/login?error=auth_failed">
          </noscript>
        </body>
        </html>`;

      res.setHeader('Content-Type', 'text/html');
      res.status(HttpStatus.UNAUTHORIZED).send(errorHtml);
    }
  }
}
