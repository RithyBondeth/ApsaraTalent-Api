import fetch from 'node-fetch';
import { LinkedInStrategy } from './linkedin.strategy';

jest.mock('node-fetch', () => ({ __esModule: true, default: jest.fn() }));

describe('LinkedInStrategy', () => {
  const config = {
    get: jest.fn((key: string) => {
      const values: Record<string, string> = {
        'social.linkedin.clientId': 'client-id',
        'social.linkedin.clientSecret': 'client-secret',
        'social.linkedin.callbackUrl': 'https://api.example.com/callback',
        'social.linkedin.profileUrl': 'https://linkedin.example.com/userinfo',
      };
      return values[key];
    }),
  };
  const strategy = new LinkedInStrategy(config as any);

  beforeEach(() => jest.clearAllMocks());

  it('generates a fresh OAuth state value', () => {
    expect(strategy.authorizationParams().state).toMatch(/^[0-9a-f-]{36}$/i);
  });

  it('maps the OpenID user-info response to a Passport profile', async () => {
    (fetch as unknown as jest.Mock).mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        sub: 'linkedin-1',
        email: 'person@example.com',
        given_name: 'Sok',
        family_name: 'Dara',
        picture: 'avatar.png',
      }),
    });
    const profile = await new Promise<any>((resolve, reject) => {
      strategy.userProfile('access-token', (error, value) =>
        error ? reject(error) : resolve(value),
      );
    });
    expect(fetch).toHaveBeenCalledWith(
      'https://linkedin.example.com/userinfo',
      {
        headers: { Authorization: 'Bearer access-token' },
      },
    );
    expect(profile).toEqual(
      expect.objectContaining({
        id: 'linkedin-1',
        provider: 'linkedin',
        emails: [{ value: 'person@example.com' }],
      }),
    );
    await expect(strategy.validate('', '', profile)).resolves.toBe(profile);
  });

  it('passes unsuccessful profile responses to Passport', async () => {
    const response = { ok: false, status: 401 };
    (fetch as unknown as jest.Mock).mockResolvedValue(response);
    const error = await new Promise<any>((resolve) => {
      strategy.userProfile('bad-token', (caught) => resolve(caught));
    });
    expect(error).toBe(response);
  });
});
