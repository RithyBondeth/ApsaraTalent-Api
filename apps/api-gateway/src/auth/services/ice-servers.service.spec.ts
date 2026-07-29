import { IceServersService } from './ice-servers.service';

describe('IceServersService', () => {
  const originalSid = process.env.TWILIO_ACCOUNT_SID;
  const originalToken = process.env.TWILIO_AUTH_TOKEN;

  afterEach(() => {
    process.env.TWILIO_ACCOUNT_SID = originalSid;
    process.env.TWILIO_AUTH_TOKEN = originalToken;
    jest.restoreAllMocks();
  });

  it('uses public STUN servers when Twilio is not configured', async () => {
    delete process.env.TWILIO_ACCOUNT_SID;
    delete process.env.TWILIO_AUTH_TOKEN;
    const fetchSpy = jest.spyOn(global, 'fetch');
    const result = await new IceServersService().getIceServers();
    expect(result.iceServers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ urls: expect.stringContaining('stun:') }),
      ]),
    );
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('requests short-lived Twilio TURN credentials with basic authentication', async () => {
    process.env.TWILIO_ACCOUNT_SID = 'AC123';
    process.env.TWILIO_AUTH_TOKEN = 'secret';
    const ice = [{ urls: 'turn:example.com', username: 'u', credential: 'p' }];
    jest.spyOn(global, 'fetch').mockResolvedValue({
      json: jest.fn().mockResolvedValue({ ice_servers: ice }),
    } as any);
    await expect(new IceServersService().getIceServers()).resolves.toEqual({
      iceServers: ice,
    });
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/Accounts/AC123/Tokens.json'),
      expect.objectContaining({
        method: 'POST',
        headers: {
          Authorization: `Basic ${Buffer.from('AC123:secret').toString('base64')}`,
        },
      }),
    );
  });

  it('falls back safely when Twilio fails or omits ICE servers', async () => {
    process.env.TWILIO_ACCOUNT_SID = 'AC123';
    process.env.TWILIO_AUTH_TOKEN = 'secret';
    jest.spyOn(global, 'fetch').mockRejectedValue(new Error('network'));
    const failed = await new IceServersService().getIceServers();
    expect(failed.iceServers[0]).toHaveProperty('urls');
    (fetch as jest.Mock).mockResolvedValue({
      json: jest.fn().mockResolvedValue({}),
    });
    const omitted = await new IceServersService().getIceServers();
    expect(omitted.iceServers[0]).toHaveProperty('urls');
  });
});
