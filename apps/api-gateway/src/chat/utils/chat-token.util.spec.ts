import { extractChatToken } from './chat-token.util';

const socket = (handshake: Record<string, unknown>) => ({ handshake }) as any;

describe('extractChatToken', () => {
  it.each([
    [{ auth: { token: 'auth-token' }, headers: {}, query: {} }, 'auth-token'],
    [
      {
        auth: {},
        headers: { authorization: 'Bearer header-token' },
        query: {},
      },
      'header-token',
    ],
    [{ auth: {}, headers: {}, query: { token: 'query-token' } }, 'query-token'],
    [
      {
        auth: {},
        headers: { cookie: 'other=1; auth-token=cookie%20token' },
        query: {},
      },
      'cookie token',
    ],
  ])(
    'extracts credentials in supported handshake form',
    (handshake, expected) => {
      expect(extractChatToken(socket(handshake))).toBe(expected);
    },
  );

  it('uses auth before header, query, and cookie credentials', () => {
    expect(
      extractChatToken(
        socket({
          auth: { token: 'first' },
          headers: {
            authorization: 'Bearer second',
            cookie: 'auth-token=fourth',
          },
          query: { token: 'third' },
        }),
      ),
    ).toBe('first');
  });

  it.each(['', ' ', 'Bearer ', 'bearer   '])(
    'rejects an empty token value',
    (token) => {
      expect(
        extractChatToken(socket({ auth: { token }, headers: {}, query: {} })),
      ).toBeNull();
    },
  );
});
