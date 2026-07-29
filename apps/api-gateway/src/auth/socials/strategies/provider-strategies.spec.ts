import 'reflect-metadata';
import { FacebookStrategy } from './facebook.strategy';
import { GitHubStrategy } from './github.strategy';
import { GoogleStrategy } from './google.strategy';

describe('OAuth provider strategies', () => {
  const config = {
    get: jest.fn((key: string) => `${key}-value`),
  };

  it('normalizes a complete Facebook profile', async () => {
    const strategy = new FacebookStrategy(config as any);
    await expect(
      strategy.validate('', '', {
        id: 'facebook-1',
        emails: [{ value: 'person@example.com' }],
        name: { givenName: 'Sok', familyName: 'Dara' },
        photos: [{ value: 'avatar.png' }],
      } as any),
    ).resolves.toEqual({
      id: 'facebook-1',
      email: 'person@example.com',
      firstname: 'Sok',
      lastname: 'Dara',
      picture: 'avatar.png',
      provider: 'facebook',
    });
  });

  it('uses null for optional Facebook profile fields', async () => {
    const strategy = new FacebookStrategy(config as any);
    await expect(
      strategy.validate('', '', { id: 'facebook-1' } as any),
    ).resolves.toEqual(
      expect.objectContaining({
        email: null,
        firstname: null,
        lastname: null,
        picture: null,
      }),
    );
  });

  it('normalizes GitHub profiles with and without optional contact data', async () => {
    const strategy = new GitHubStrategy(config as any);
    await expect(
      strategy.validate('', '', {
        id: 'github-1',
        username: 'person',
        emails: [{ value: 'p@example.com' }],
        photos: [{ value: 'p.png' }],
      }),
    ).resolves.toEqual({
      id: 'github-1',
      username: 'person',
      email: 'p@example.com',
      picture: 'p.png',
      provider: 'github',
    });
    await expect(
      strategy.validate('', '', { id: 'github-2', username: 'private' }),
    ).resolves.toEqual(
      expect.objectContaining({ email: undefined, picture: undefined }),
    );
  });

  it('passes a normalized Google profile to Passport', async () => {
    const done = jest.fn();
    const strategy = new GoogleStrategy(config as any);
    await strategy.validate(
      '',
      '',
      {
        id: 'google-1',
        name: { givenName: 'Sok', familyName: 'Dara' },
        emails: [{ value: 'person@example.com' }],
        photos: [{ value: 'avatar.png' }],
      },
      done,
    );
    expect(done).toHaveBeenCalledWith(null, {
      id: 'google-1',
      firstName: 'Sok',
      lastName: 'Dara',
      email: 'person@example.com',
      picture: 'avatar.png',
    });
  });
});
