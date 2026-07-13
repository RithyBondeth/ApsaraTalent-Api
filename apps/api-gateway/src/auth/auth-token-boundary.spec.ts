import { ConfigService } from '@nestjs/config';
import { ClientProxy } from '@nestjs/microservices';
import { instanceToPlain } from 'class-transformer';
import { of } from 'rxjs';
import { Response } from 'express';
import { UserResponseDTO } from '@app/contracts';
import { AuthController } from './basic/controllers/auth.controller';
import { SocialAuthService } from './services/social-auth.service';

describe('authentication token boundary', () => {
  const authClient = {
    send: jest.fn(),
  } as unknown as ClientProxy;
  const response = {
    cookie: jest.fn(),
    clearCookie: jest.fn(),
  } as unknown as Response;
  const controller = new AuthController(authClient, null, null);

  beforeEach(() => jest.clearAllMocks());

  it('sets httpOnly cookies but omits tokens from the login response', async () => {
    (authClient.send as jest.Mock).mockReturnValue(
      of({
        message: 'Logged in',
        accessToken: 'access-secret',
        refreshToken: 'refresh-secret',
        user: { id: 'user-1', role: 'employee' },
      }),
    );

    const result = await controller.login(
      { identifier: 'user@example.com', password: 'password' },
      response,
    );

    expect(response.cookie).toHaveBeenCalledWith(
      'auth-token',
      'access-secret',
      expect.objectContaining({ httpOnly: true }),
    );
    expect(response.cookie).toHaveBeenCalledWith(
      'refresh-token',
      'refresh-secret',
      expect.objectContaining({ httpOnly: true }),
    );
    expect(result).not.toHaveProperty('accessToken');
    expect(result).not.toHaveProperty('refreshToken');
  });

  it('takes refresh credentials from the httpOnly cookie and hides rotated tokens', async () => {
    (authClient.send as jest.Mock).mockReturnValue(
      of({
        message: 'Refreshed',
        accessToken: 'new-access-secret',
        refreshToken: 'new-refresh-secret',
        user: { id: 'user-1', role: 'employee' },
      }),
    );

    const result = await controller.refreshToken(
      { cookies: { 'refresh-token': 'refresh-secret' } } as any,
      response,
    );

    expect(authClient.send).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ refreshToken: 'refresh-secret' }),
    );
    expect(result).not.toHaveProperty('accessToken');
    expect(result).not.toHaveProperty('refreshToken');
  });

  it('never serializes stored authentication secrets in user responses', () => {
    const output = instanceToPlain(
      new UserResponseDTO({
        id: 'user-1',
        refreshToken: 'refresh-secret',
        password: 'password-hash',
        twoFactorSecret: '2fa-secret',
      }),
    );

    expect(output).not.toHaveProperty('refreshToken');
    expect(output).not.toHaveProperty('password');
    expect(output).not.toHaveProperty('twoFactorSecret');
  });

  it('does not put tokens in OAuth postMessage HTML', () => {
    const service = new SocialAuthService(
      authClient,
      new ConfigService({ frontend: { origin: 'https://app.example.com' } }),
    );
    const html = (service as any).buildSuccessHtml({
      targetOrigin: 'https://app.example.com',
      successType: 'GOOGLE_AUTH_SUCCESS',
      remember: false,
      result: {
        accessToken: 'access-secret',
        refreshToken: 'refresh-secret',
        role: 'employee',
      },
    });

    expect(html).not.toContain('access-secret');
    expect(html).not.toContain('refresh-secret');
    expect(html).not.toContain('accessToken');
    expect(html).not.toContain('refreshToken');
  });
});
