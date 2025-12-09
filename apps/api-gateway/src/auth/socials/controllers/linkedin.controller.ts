import {
  BadRequestException,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { firstValueFrom, timeout } from 'rxjs';
import { AUTH_SERVICE } from 'utils/constants/auth-service.constant';
import { ClientProxy } from '@nestjs/microservices';
import { LinkedInAuthGuard } from '../guards/linkedin-auth.guard';
import { ILinkedInAuthController } from '@app/common/interfaces/auth-controller.interface';
import { Response } from 'express';
import { ConfigService } from '@nestjs/config';

@Controller('social')
export class LinkedInController implements ILinkedInAuthController {
  constructor(
    @Inject(AUTH_SERVICE.NAME) private readonly authService: ClientProxy,
    private readonly configService: ConfigService,
  ) {}

  @Get('linkedin/login')
  @HttpCode(HttpStatus.OK)
  @UseGuards(LinkedInAuthGuard)
  async linkedInAuth() {
    // Passport will handle the redirect
  }

  @Get('linkedin/callback')
  @HttpCode(HttpStatus.OK)
  @UseGuards(LinkedInAuthGuard)
  async linkedInCallback(@Req() req: any, @Res() res: Response) {
    try {
      // Get remember preference from query parameter (if passed during login)
      const rememberMe = req.query.remember === 'true';

      const linkedDataDTO = {
        id: req.user.id,
        email: req.user.emails?.[0]?.value ?? null,
        firstName: req.user.name?.givenName ?? null,
        lastName: req.user.name?.familyName ?? null,
        picture: req.user.photos?.[0]?.value ?? null,
        provider: req.user.provider ?? null,
      };

      const result = await firstValueFrom(
        this.authService
          .send(AUTH_SERVICE.ACTIONS.LINKEDIN_AUTH, linkedDataDTO)
          .pipe(timeout(10000)), // 10 second timeout
      );

      if (!result?.accessToken) {
        throw new BadRequestException('LinkedIn authentication failed');
      }

      const FRONTEND_ORIGIN =
        this.configService.get<string>('FRONTEND_ORIGIN') ?? // Fixed typo: was 'FRONTED_ORIGIN'
        'http://localhost:4000';

      const isProduction =
        this.configService.get<string>('NODE_ENV') === 'production';

      // Set cookie maxAge based on rememberMe
      const maxAge = rememberMe
        ? 30 * 24 * 60 * 60 * 1000 // 30 days
        : 24 * 60 * 60 * 1000; // 1 day

      // ONLY set cookies here - httpOnly and secure
      const cookieOptions = {
        httpOnly: true, // Prevents JavaScript access
        secure: isProduction,
        sameSite: 'lax' as const, // 'lax' is better for OAuth redirects
        maxAge,
        path: '/',
      };

      res.cookie('auth-token', result.accessToken, cookieOptions);

      if (result.refreshToken) {
        res.cookie('refresh-token', result.refreshToken, cookieOptions);
      }

      // Store remember preference separately (not httpOnly, so frontend can read it)
      res.cookie('auth-remember', 'true', {
        httpOnly: false, // Frontend needs to read this
        secure: isProduction,
        sameSite: 'lax' as const,
        maxAge,
        path: '/',
      });

      // ONLY send user info (NO TOKENS) via postMessage
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
                type: 'LINKEDIN_AUTH_SUCCESS',
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
      console.error('LinkedIn authentication error:', error);

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
                type: 'LINKEDIN_AUTH_ERROR',
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
