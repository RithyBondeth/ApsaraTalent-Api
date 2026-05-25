import {
  BadRequestException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ISocialAuthService } from '@app/contracts/interfaces/service';
import { ConfigService } from '@nestjs/config';
import { ClientProxy } from '@nestjs/microservices';
import { Response } from 'express';
import { firstValueFrom, timeout } from 'rxjs';
import { AUTH_SERVICE } from '@app/contracts/constants/service-actions/auth-service.constant';
import { AUTH } from '@app/contracts/constants/domain/auth.constant';
import {
  isProductionEnvironment,
  setAuthTokenCookies,
  setRememberCookie,
} from '../utils/auth-cookie.util';
import {
  IErrorHtmlOptions,
  ISocialAuthCallbackOptions,
  ISocialAuthResult,
  ISuccessHtmlOptions,
} from '@app/contracts';

@Injectable()
export class SocialAuthService implements ISocialAuthService {
  private readonly logger = new Logger(SocialAuthService.name);

  constructor(
    @Inject(AUTH_SERVICE.NAME) private readonly authService: ClientProxy,
    private readonly configService: ConfigService,
  ) {}

  async handleCallback(
    socialAuthParams: ISocialAuthCallbackOptions,
  ): Promise<void> {
    const frontendOrigin = this.getFrontendOrigin();
    const {
      req,
      res,
      action,
      payload,
      providerLabel,
      successType,
      errorType,
      failureMessage,
      timeoutMs = AUTH.OAUTH_CALLBACK_TIMEOUT,
    } = socialAuthParams;

    try {
      const remember = req.session?.remember;
      const rememberMe = this.getRememberFlag(remember);

      if (!action) {
        throw new BadRequestException(
          `${providerLabel} authentication action is missing`,
        );
      }

      if (!payload) {
        throw new BadRequestException(
          `${providerLabel} authentication payload is missing`,
        );
      }

      const result = await firstValueFrom(
        this.authService
          .send<ISocialAuthResult>(action, payload)
          .pipe(timeout(timeoutMs)),
      );

      if (!result) {
        throw new BadRequestException(failureMessage);
      }

      // New user: no tokens yet (they need to pick a role first).
      // Still send a success postMessage so the frontend can redirect to signup.
      if (result.newUser && !result.accessToken) {
        const html = this.buildSuccessHtml({
          targetOrigin: frontendOrigin,
          successType,
          remember: rememberMe,
          result,
        });
        res.setHeader('Content-Type', 'text/html');
        res.send(html);
        return;
      }

      if (!result.accessToken) {
        throw new BadRequestException(failureMessage);
      }

      this.setSocialAuthCookies(res, remember, result);

      const html = this.buildSuccessHtml({
        targetOrigin: frontendOrigin,
        successType,
        remember: rememberMe,
        result,
      });
      res.setHeader('Content-Type', 'text/html');
      res.send(html);
    } catch (error) {
      this.logger.error(
        `${providerLabel} authentication error`,
        error instanceof Error ? error.stack : String(error),
      );

      const errorHtml = this.buildErrorHtml({
        targetOrigin: frontendOrigin,
        errorType,
        errorMessage: 'Authentication failed. Please try again.',
      });

      res.setHeader('Content-Type', 'text/html');
      res.status(HttpStatus.UNAUTHORIZED).send(errorHtml);
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Private helpers                                                   */
  /* ------------------------------------------------------------------ */
  private getFrontendOrigin(): string {
    const origin = this.configService.get<string>('frontend.origin');
    return origin?.split(',')[0]?.trim() || 'http://localhost:4000';
  }

  private getRememberFlag(remember: unknown): boolean {
    return remember === true || remember === 'true';
  }

  private setSocialAuthCookies(
    res: Response,
    remember: unknown,
    result: ISocialAuthResult,
  ): void {
    const rememberMe = this.getRememberFlag(remember);
    const maxAge = rememberMe ? AUTH.REMEMBER_ME_MAXAGE : AUTH.TOKEN_MAXAGE;
    const isProduction =
      this.configService.get<string>('NODE_ENV') === 'production' ||
      isProductionEnvironment();

    setAuthTokenCookies(res, {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      accessMaxAge: maxAge,
      refreshMaxAge: maxAge,
      isProduction,
    });
    setRememberCookie(res, rememberMe, { maxAge, isProduction });
  }

  private buildSuccessHtml({
    targetOrigin,
    successType,
    remember,
    result,
  }: ISuccessHtmlOptions): string {
    return `
    <!doctype html>
    <html>
    <body>
      <script>
        (function () {
          const targetOrigin = ${JSON.stringify(targetOrigin)};
          const message = {
            type: ${JSON.stringify(successType)},
            newUser: ${JSON.stringify(result.newUser || false)},
            accessToken: ${JSON.stringify(result.accessToken)},
            refreshToken: ${JSON.stringify(result.refreshToken ?? null)},
            remember: ${JSON.stringify(remember)},
            user: {
              email: ${JSON.stringify(result.email ?? null)},
              firstname: ${JSON.stringify(result.firstname ?? null)},
              lastname: ${JSON.stringify(result.lastname ?? null)},
              picture: ${JSON.stringify(result.picture ?? null)},
              role: ${JSON.stringify(result.role ?? null)},
              provider: ${JSON.stringify(result.provider ?? null)},
              lastLoginMethod: ${JSON.stringify(result.lastLoginMethod ?? null)},
              lastLoginAt: ${JSON.stringify(result.lastLoginAt ?? null)}
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
      <noscript>
        <p>Authentication successful. Redirecting...</p>
        <meta http-equiv="refresh" content="0;url=${targetOrigin}/feed">
      </noscript>
    </body>
    </html>`;
  }

  private buildErrorHtml({
    targetOrigin,
    errorType,
    errorMessage,
  }: IErrorHtmlOptions): string {
    return `
    <!doctype html>
    <html>
    <body>
      <script>
        (function () {
          const targetOrigin = ${JSON.stringify(targetOrigin)};
          const message = {
            type: ${JSON.stringify(errorType)},
            error: ${JSON.stringify(errorMessage)}
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
        <meta http-equiv="refresh" content="0;url=${targetOrigin}/login?error=auth_failed">
      </noscript>
    </body>
    </html>`;
  }
}
