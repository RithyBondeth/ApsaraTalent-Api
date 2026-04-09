import { BadRequestException, HttpStatus, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import { firstValueFrom, timeout } from 'rxjs';
import {
  isProductionEnvironment,
  setAuthTokenCookies,
  setRememberCookie,
} from '../../utils/auth-cookie.util';
import {
  TErrorHtmlOptions,
  TSocialAuthCallbackOptions,
  TSocialAuthResult,
  TSuccessHtmlOptions,
} from '@app/contracts/types/auth.type';

const logger = new Logger('SocialAuthUtil');

export function getFrontendOrigin(configService: ConfigService): string {
  const frontendOriginConfig = configService.get<string>('frontend.origin');
  return frontendOriginConfig?.split(',')[0]?.trim() || 'http://localhost:4000';
}

export function getRememberFlag(remember: unknown): boolean {
  return remember === true || remember === 'true';
}

export function setSocialAuthCookies(
  res: Response,
  configService: ConfigService,
  remember: unknown,
  result: TSocialAuthResult,
): void {
  const rememberMe = getRememberFlag(remember);
  const maxAge = rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
  const isProduction =
    configService.get<string>('NODE_ENV') === 'production' ||
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

export function buildSocialAuthSuccessHtml({
  targetOrigin,
  successType,
  remember,
  result,
}: TSuccessHtmlOptions): string {
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

export function buildSocialAuthErrorHtml({
  targetOrigin,
  errorType,
  errorMessage,
}: TErrorHtmlOptions): string {
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

export async function handleSocialAuthCallback({
  authService,
  configService,
  req,
  res,
  action,
  payload,
  providerLabel,
  successType,
  errorType,
  failureMessage,
  timeoutMs = 10000,
}: TSocialAuthCallbackOptions): Promise<void> {
  const frontendOrigin = getFrontendOrigin(configService);

  try {
    const remember = req.session?.remember;
    const rememberMe = getRememberFlag(remember);

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
      authService
        .send<TSocialAuthResult>(action, payload)
        .pipe(timeout(timeoutMs)),
    );

    if (!result) {
      throw new BadRequestException(failureMessage);
    }

    // New user: no tokens yet (they need to pick a role first).
    // Still send a success postMessage so the frontend can redirect to signup.
    if (result.newUser && !result.accessToken) {
      const html = buildSocialAuthSuccessHtml({
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

    setSocialAuthCookies(res, configService, remember, result);

    const html = buildSocialAuthSuccessHtml({
      targetOrigin: frontendOrigin,
      successType,
      remember: rememberMe,
      result,
    });

    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (error) {
    logger.error(
      `${providerLabel} authentication error`,
      error instanceof Error ? error.stack : String(error),
    );

    const errorHtml = buildSocialAuthErrorHtml({
      targetOrigin: frontendOrigin,
      errorType,
      errorMessage: 'Authentication failed. Please try again.',
    });

    res.setHeader('Content-Type', 'text/html');
    res.status(HttpStatus.UNAUTHORIZED).send(errorHtml);
  }
}
