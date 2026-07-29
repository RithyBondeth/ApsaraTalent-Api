import { UnauthorizedException } from '@nestjs/common';
import { hashRefreshToken } from '@app/common/jwt/refresh-token-hash.util';
import { FacebookAuthService } from './facebook-auth.service';
import { GithubAuthService } from './github-auth.service';
import { GoogleAuthService } from './google-auth.service';
import { LinkedInAuthService } from './linkedin-auth.service';

describe('social authentication services', () => {
  const repository = { findOne: jest.fn(), save: jest.fn() };
  const jwt = {
    generateToken: jest.fn(),
    generateRefreshToken: jest.fn(),
  };
  const cache = { clearSafe: jest.fn() };
  const logger = { error: jest.fn() };

  const providers = [
    {
      name: 'Google',
      service: new GoogleAuthService(
        repository as any,
        jwt as any,
        cache as any,
        logger as any,
      ),
      login: 'googleLogin',
      idField: 'googleId',
      data: {
        id: 'provider-id',
        email: 'person@example.com',
        firstName: 'A',
        lastName: 'User',
        picture: 'photo',
      },
    },
    {
      name: 'GitHub',
      service: new GithubAuthService(
        repository as any,
        jwt as any,
        cache as any,
        logger as any,
      ),
      login: 'githubLogin',
      idField: 'githubId',
      data: {
        id: 'provider-id',
        email: 'person@example.com',
        username: 'person',
        picture: 'photo',
        provider: 'github',
      },
    },
    {
      name: 'Facebook',
      service: new FacebookAuthService(
        repository as any,
        jwt as any,
        cache as any,
        logger as any,
      ),
      login: 'facebookLogin',
      idField: 'facebookId',
      data: {
        id: 'provider-id',
        email: 'person@example.com',
        firstname: 'A',
        lastname: 'User',
        picture: 'photo',
      },
    },
    {
      name: 'LinkedIn',
      service: new LinkedInAuthService(
        repository as any,
        jwt as any,
        cache as any,
        logger as any,
      ),
      login: 'linkedInLogin',
      idField: 'linkedinId',
      data: {
        id: 'provider-id',
        email: 'person@example.com',
        firstName: 'A',
        lastName: 'User',
        picture: 'photo',
      },
    },
  ] as const;

  beforeEach(() => {
    jest.clearAllMocks();
    repository.save.mockImplementation(async (user) => user);
    jwt.generateToken.mockResolvedValue('access');
    jwt.generateRefreshToken.mockResolvedValue('refresh');
  });

  it.each(providers)(
    '$name returns role-selection data for a new user',
    async (p) => {
      repository.findOne.mockResolvedValue(null);

      const result = await (p.service[p.login] as any)(p.data);

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { email: p.data.email },
      });
      expect(result).toEqual(
        expect.objectContaining({ newUser: true, email: p.data.email }),
      );
      expect(jwt.generateToken).not.toHaveBeenCalled();
    },
  );

  it.each(providers)(
    '$name links an existing user and persists its refresh token',
    async (p) => {
      const user: Record<string, unknown> = {
        id: 'u1',
        email: p.data.email,
        role: 'employee',
      };
      repository.findOne.mockResolvedValue(user);

      const result = await (p.service[p.login] as any)(p.data);

      expect(user[p.idField]).toBe(p.data.id);
      expect(user.refreshToken).toBe(hashRefreshToken('refresh'));
      expect(repository.save).toHaveBeenCalledWith(user);
      expect(jwt.generateToken).toHaveBeenCalledWith({
        id: 'u1',
        info: p.data.email,
        role: 'employee',
      });
      expect(cache.clearSafe).toHaveBeenCalledWith('u1', p.name);
      expect(result).toEqual(
        expect.objectContaining({
          newUser: false,
          accessToken: 'access',
          refreshToken: 'refresh',
        }),
      );
    },
  );

  it.each(providers)(
    '$name hides internal authentication failures',
    async (p) => {
      repository.findOne.mockRejectedValue(new Error('database details'));

      const error = await (p.service[p.login] as any)(p.data).catch(
        (caught: Error) => caught,
      );
      expect(
        error instanceof UnauthorizedException ||
          error.message === 'Failed to login with LinkedIn',
      ).toBe(true);
      expect(error.message).not.toContain('database details');
      expect(logger.error).toHaveBeenCalled();
    },
  );
});
