import { resolveClientIp, ThrottlerGuard } from './throttler.guard';

describe('resolveClientIp', () => {
  it('prefers the left-most forwarded address over the proxy socket', () => {
    // Behind Railway's edge every request shares one socket peer. Tracking
    // that address puts all users in a single bucket — a global self-DoS.
    const req = {
      ips: ['203.0.113.7', '10.0.0.1'],
      ip: '10.0.0.1',
      socket: { remoteAddress: '10.0.0.1' },
    };

    expect(resolveClientIp(req)).toBe('203.0.113.7');
  });

  it('falls back to req.ip when there is no proxy chain', () => {
    expect(resolveClientIp({ ips: [], ip: '198.51.100.4' })).toBe(
      '198.51.100.4',
    );
  });

  it('falls back to the raw socket address when Express resolves nothing', () => {
    expect(resolveClientIp({ socket: { remoteAddress: '198.51.100.9' } })).toBe(
      '198.51.100.9',
    );
  });

  it('returns a stable placeholder rather than undefined', () => {
    // An undefined tracker key collapses every unidentifiable caller into one
    // bucket silently; a named one at least shows up in metrics.
    expect(resolveClientIp({})).toBe('unknown');
    expect(resolveClientIp(undefined as any)).toBe('unknown');
  });

  it('does not group distinct clients behind the same proxy', () => {
    const first = resolveClientIp({ ips: ['203.0.113.1', '10.0.0.1'] });
    const second = resolveClientIp({ ips: ['203.0.113.2', '10.0.0.1'] });

    expect(first).not.toBe(second);
  });
});

describe('ThrottlerGuard', () => {
  it('tracks by the resolved client IP', async () => {
    const guard = new ThrottlerGuard({} as any, {} as any, {} as any);

    await expect(
      (guard as any).getTracker({ ips: ['203.0.113.7'], ip: '10.0.0.1' }),
    ).resolves.toBe('203.0.113.7');
  });
});
