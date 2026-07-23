import 'reflect-metadata';
import { UnauthorizedException } from '@nestjs/common';
import { FacebookController } from '../controllers/facebook.controller';
import { GithubController } from '../controllers/github.controller';
import { GoogleController } from '../controllers/google.controller';
import { LinkedInController } from '../controllers/linkedin.controller';
import { FacebookAuthGuard } from '../guards/facebook-auth.guard';
import { GithubAuthGuard } from '../guards/github-auth.guard';
import { GoogleAuthGuard } from '../guards/google-auth.guard';
import { LinkedInAuthGuard } from '../guards/linkedin-auth.guard';
import { buildPublicCallbackUrl } from './oauth-callback-url.util';

describe('OAuth HTTP boundary', () => {
  function request(overrides: Record<string, unknown> = {}) {
    return {
      headers: {},
      protocol: 'http',
      query: {},
      session: {},
      get: jest.fn(() => 'localhost:3000'),
      ...overrides,
    } as any;
  }

  it('builds a local callback from the direct request origin', () => {
    expect(buildPublicCallbackUrl(request(), 'google')).toBe(
      'http://localhost:3000/social/google/callback',
    );
  });

  it('uses only the first trimmed reverse-proxy protocol and host', () => {
    const req = request({
      headers: {
        'x-forwarded-proto': ' https, http',
        'x-forwarded-host': ' api.example.com, internal:3000',
      },
    });
    expect(buildPublicCallbackUrl(req, 'github')).toBe(
      'https://api.example.com/social/github/callback',
    );
  });

  const guards = [
    ['Google', new GoogleAuthGuard(), 'google'],
    ['GitHub', new GithubAuthGuard(), 'github'],
    ['Facebook', new FacebookAuthGuard(), 'facebook'],
    ['LinkedIn', new LinkedInAuthGuard(), 'linkedin'],
  ] as const;

  it.each(guards)(
    '%s guard creates its public callback URL',
    (_name, guard, provider) => {
      const req = request({
        headers: {
          'x-forwarded-proto': 'https',
          'x-forwarded-host': 'api.example.com',
        },
      });
      const context = {
        switchToHttp: () => ({ getRequest: () => req }),
      } as any;
      expect(guard.getAuthenticateOptions(context)).toEqual({
        callbackURL: `https://api.example.com/social/${provider}/callback`,
      });
    },
  );

  it.each(guards)(
    '%s guard returns users and rejects empty authentication',
    (name, guard) => {
      const user = { id: 'provider-user' };
      expect(guard.handleRequest(null, user)).toBe(user);
      expect(() =>
        guard.handleRequest(null, null, { message: 'denied' }),
      ).toThrow(new UnauthorizedException('denied'));
      const providerError = new Error(`${name} provider failed`);
      expect(() => guard.handleRequest(providerError, null)).toThrow(
        providerError,
      );
    },
  );

  const controllerCases = [
    ['Google', GoogleController, 'googleCallback', 'GOOGLE_AUTH_SUCCESS'],
    ['GitHub', GithubController, 'githubCallback', 'GITHUB_AUTH_SUCCESS'],
    [
      'Facebook',
      FacebookController,
      'facebookCallback',
      'FACEBOOK_AUTH_SUCCESS',
    ],
  ] as const;

  it.each(controllerCases)(
    '%s callback delegates provider data to the shared callback handler',
    async (_name, Controller, method, successType) => {
      const social = { handleCallback: jest.fn().mockResolvedValue(undefined) };
      const controller = new Controller(social as any) as any;
      const req = { user: { id: 'provider-user' } };
      const res = {};
      await controller[method](req, res);
      expect(social.handleCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          req,
          res,
          payload: req.user,
          successType,
        }),
      );
    },
  );

  it('normalizes LinkedIn’s nested provider profile before delegation', async () => {
    const social = { handleCallback: jest.fn().mockResolvedValue(undefined) };
    const controller = new LinkedInController(social as any);
    const req = {
      user: {
        id: 'linkedin-user',
        emails: [{ value: 'person@example.com' }],
        name: { givenName: 'Sok', familyName: 'Dara' },
        photos: [{ value: 'avatar.png' }],
        provider: 'linkedin',
      },
    };
    await controller.linkedInCallback(req, {} as any);
    expect(social.handleCallback).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: {
          id: 'linkedin-user',
          email: 'person@example.com',
          firstName: 'Sok',
          lastName: 'Dara',
          picture: 'avatar.png',
          provider: 'linkedin',
        },
      }),
    );
  });
});
