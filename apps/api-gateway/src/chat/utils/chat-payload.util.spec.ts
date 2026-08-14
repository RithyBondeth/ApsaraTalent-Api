import { CHAT } from '@app/contracts/constants/domain/chat.constant';
import { validateEditMessage, validateSendMessage } from './chat-payload.util';

const TYPES = ['text', 'image', 'file'] as const;

describe('validateSendMessage', () => {
  it('accepts a plain text message', () => {
    expect(
      validateSendMessage({ receiverId: 'u1', content: 'hello' }, TYPES),
    ).toBeNull();
  });

  it.each([null, {}, { receiverId: 42 }, { receiverId: '' }])(
    'rejects a missing or non-string receiverId: %j',
    (dto) => {
      expect(validateSendMessage(dto as any, TYPES)).toBe(
        'Invalid message payload: missing receiverId',
      );
    },
  );

  it('rejects content past the maximum length', () => {
    expect(
      validateSendMessage(
        { receiverId: 'u1', content: 'x'.repeat(CHAT.MAX_MESSAGE_LENGTH + 1) },
        TYPES,
      ),
    ).toBe(`Message must be at most ${CHAT.MAX_MESSAGE_LENGTH} characters`);
  });

  it('rejects a message that is empty once trimmed and has no attachment', () => {
    expect(
      validateSendMessage({ receiverId: 'u1', content: '   ' }, TYPES),
    ).toBe('Message cannot be empty');
  });

  it('allows empty content when an attachment is present', () => {
    expect(
      validateSendMessage(
        { receiverId: 'u1', content: '  ', attachment: { name: 'cv.pdf' } },
        TYPES,
      ),
    ).toBeNull();
  });

  it('defaults a missing type to text and rejects unknown types', () => {
    expect(
      validateSendMessage({ receiverId: 'u1', content: 'x' }, TYPES),
    ).toBeNull();
    expect(
      validateSendMessage(
        { receiverId: 'u1', content: 'x', type: 'video' },
        TYPES,
      ),
    ).toBe('Invalid message type');
  });
});

describe('validateEditMessage', () => {
  it('accepts a well-formed edit', () => {
    expect(
      validateEditMessage({ messageId: 'm1', newContent: 'updated' }),
    ).toBeNull();
  });

  it.each([null, {}, { messageId: 7 }])(
    'rejects a missing or non-string messageId: %j',
    (dto) => {
      expect(validateEditMessage(dto as any)).toBe('messageId is required');
    },
  );

  it.each([undefined, '', '   ', 'x'.repeat(CHAT.MAX_MESSAGE_LENGTH + 1)])(
    'rejects new content that is empty or too long: %j',
    (newContent) => {
      expect(validateEditMessage({ messageId: 'm1', newContent })).toBe(
        `Message must be 1–${CHAT.MAX_MESSAGE_LENGTH} characters`,
      );
    },
  );
});
