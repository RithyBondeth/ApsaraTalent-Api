import { createHash } from 'node:crypto';
import { MobileOAuthService } from './mobile-oauth.service';
import { captureNativeOAuth } from '../socials/shared/native-oauth';
import { SocialAuthService } from './social-auth.service';
import { ConfigService } from '@nestjs/config';
import { of } from 'rxjs';

describe('native OAuth contract', () => {
  const verifier = 'a'.repeat(43);
  const challenge = createHash('sha256').update(verifier).digest('base64url');
  const state = 's'.repeat(43);
  const flow = { redirect: 'apsaratalent://oauth/callback', challenge, state };

  it('accepts only the app callback, S256 challenge, and a random state', () => {
    const req = {
      path: '/social/google/login',
      session: {},
      query: {
        mobile: 'true',
        redirect_uri: flow.redirect,
        code_challenge: challenge,
        code_challenge_method: 'S256',
        state,
      },
    };
    captureNativeOAuth(req as any);
    expect(req.session).toEqual({ nativeOAuth: flow });
    for (const value of ['https://evil.test', 'apsaratalent://evil/callback']) {
      expect(() =>
        captureNativeOAuth({
          ...req,
          query: { ...req.query, redirect_uri: value },
        } as any),
      ).toThrow();
    }
    expect(() =>
      captureNativeOAuth({
        ...req,
        query: { ...req.query, code_challenge_method: 'plain' },
      } as any),
    ).toThrow();
  });

  it('issues expiring codes and binds exchange to the verifier', async () => {
    const redis = { issueGrant: jest.fn(), consumeGrant: jest.fn() };
    const broker = new MobileOAuthService(redis as any);
    const result = {
      accessToken: 'private-access',
      refreshToken: 'private-refresh',
    };
    const code = await broker.issue(result, true, challenge);
    expect(code).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(redis.issueGrant).toHaveBeenCalledWith(
      expect.stringMatching(/^oauth:mobile:/),
      { result, remember: true, challenge },
      60_000,
    );
    redis.consumeGrant
      .mockResolvedValueOnce({ result, remember: true, challenge })
      .mockResolvedValue(null);
    await expect(broker.consume(code, verifier)).resolves.toMatchObject({
      remember: true,
    });
    expect(redis.consumeGrant).toHaveBeenCalledWith(
      expect.any(String),
      challenge,
    );
    await expect(broker.consume(code, verifier)).rejects.toThrow(
      'invalid or expired',
    );
    redis.issueGrant.mockRejectedValue(new Error('offline'));
    await expect(broker.issue(result, true, challenge)).rejects.toThrow(
      'temporarily unavailable',
    );
  });

  it('redirects native users with a code, never tokens, and validates callback state', async () => {
    const broker = { issue: jest.fn().mockResolvedValue('single-use-code') };
    const client = {
      send: jest.fn().mockReturnValue(
        of({
          accessToken: 'private-access',
          refreshToken: 'private-refresh',
        }),
      ),
    };
    const service = new SocialAuthService(
      client as any,
      new ConfigService(),
      broker as any,
    );
    const res = {
      setHeader: jest.fn(),
      redirect: jest.fn(),
      status: jest.fn(),
      send: jest.fn(),
    };
    const req = {
      session: { nativeOAuth: flow, remember: true },
      query: { state },
    };
    const options = {
      req,
      res,
      action: 'google',
      payload: {},
      providerLabel: 'Google',
      failureMessage: 'Failed',
      successType: 'success',
      errorType: 'error',
    };
    await service.handleCallback(options as any);
    const url = new URL(res.redirect.mock.calls[0][0]);
    expect(url.searchParams.get('code')).toBe('single-use-code');
    expect(url.searchParams.get('state')).toBe(state);
    expect(url.toString()).not.toContain('private');
    expect(req.session).not.toHaveProperty('nativeOAuth');
    client.send.mockClear();
    await service.handleCallback({
      ...options,
      req: { session: { nativeOAuth: flow }, query: { state: 'wrong' } },
    } as any);
    expect(client.send).not.toHaveBeenCalled();
    expect(
      new URL(res.redirect.mock.calls[1][0]).searchParams.get('status'),
    ).toBe('error');
  });

  it('returns a native signup callback for new accounts without a token grant', async () => {
    const broker = { issue: jest.fn() };
    const client = {
      send: jest.fn().mockReturnValue(
        of({
          newUser: true,
          email: 'person@example.com',
          provider: 'github',
        }),
      ),
    };
    const service = new SocialAuthService(
      client as any,
      new ConfigService(),
      broker as any,
    );
    const res = { setHeader: jest.fn(), redirect: jest.fn() };
    await service.handleCallback({
      req: { session: { nativeOAuth: flow }, query: { state } },
      res,
      action: 'github',
      payload: {},
      providerLabel: 'GitHub',
    } as any);
    const url = new URL(res.redirect.mock.calls[0][0]);
    expect(url.searchParams.get('status')).toBe('new_user');
    expect(url.searchParams.get('email')).toBe('person@example.com');
    expect(broker.issue).not.toHaveBeenCalled();
  });
});
