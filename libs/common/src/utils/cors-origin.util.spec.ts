import {
  isOriginAllowed,
  normalizeOrigin,
  parseAllowedOrigins,
} from './cors-origin.util';

describe('CORS origin utilities', () => {
  it('normalizes whitespace, case, and repeated trailing slashes', () => {
    expect(normalizeOrigin(' HTTPS://Example.COM/// ')).toBe(
      'https://example.com',
    );
  });

  it('parses multiple sources, removes blanks, and deduplicates origins', () => {
    expect(
      parseAllowedOrigins(
        'https://A.com/, https://b.com',
        undefined,
        null,
        ' https://a.com ',
      ),
    ).toEqual(['https://a.com', 'https://b.com']);
  });

  it('allows server-to-server requests, open configuration, and global wildcard', () => {
    expect(isOriginAllowed(undefined, ['https://example.com'])).toBe(true);
    expect(isOriginAllowed('https://unknown.com', [])).toBe(true);
    expect(isOriginAllowed('https://unknown.com', ['*'])).toBe(true);
  });

  it('matches exact origins after normalization', () => {
    expect(
      isOriginAllowed(' HTTPS://EXAMPLE.COM/ ', ['https://example.com']),
    ).toBe(true);
    expect(isOriginAllowed('https://evil.com', ['https://example.com'])).toBe(
      false,
    );
  });

  it.each([
    ['https://tenant.example.com', 'https://*.example.com', true],
    ['https://deep.tenant.example.com', 'https://*.example.com', true],
    ['https://example.com', 'https://*.example.com', true],
    ['http://tenant.example.com', 'https://*.example.com', false],
    ['https://tenant.evil-example.com', 'https://*.example.com', false],
    ['https://tenant.example.com:444', 'https://*.example.com:444', true],
    ['https://tenant.example.com', 'https://*.example.com:444', false],
    ['not a URL', 'https://*.example.com', false],
    ['https://tenant.example.com', 'not-a-wildcard', false],
  ])('checks wildcard origin %s against %s', (origin, allowed, expected) => {
    expect(isOriginAllowed(origin, [allowed])).toBe(expected);
  });
});
