import { parseSentrySampleRate, sanitizeSentryEvent } from './event-sanitizer';

describe('Sentry event sanitizer', () => {
  it('accepts an explicit zero tracing rate', () => {
    expect(parseSentrySampleRate('0')).toBe(0);
    expect(parseSentrySampleRate('0.25')).toBe(0.25);
    expect(parseSentrySampleRate('invalid')).toBe(0.1);
    expect(parseSentrySampleRate('2')).toBe(0.1);
  });

  it('redacts credentials and limits user PII', () => {
    expect(
      sanitizeSentryEvent({
        type: undefined,
        request: {
          cookies: { session: 'cookie-value' },
          headers: { authorization: 'Bearer value', accept: 'json' },
          data: { password: 'secret', nested: { token: 'value' } },
        },
        user: { id: 'user-1', role: 'employee', email: 'user@example.com' },
        extra: { apiKey: 'secret', safe: 'context' },
      }),
    ).toMatchObject({
      request: {
        headers: { authorization: '[Filtered]', accept: 'json' },
        data: { password: '[Filtered]', nested: { token: '[Filtered]' } },
      },
      user: { id: 'user-1', role: 'employee' },
      extra: { apiKey: '[Filtered]', safe: 'context' },
    });
  });
});
