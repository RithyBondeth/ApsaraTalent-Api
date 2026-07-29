import { buildChatNotificationPreview } from './chat-notification.util';

describe('buildChatNotificationPreview', () => {
  it.each([
    [
      { messageType: undefined, content: '', hasAttachment: false },
      'New message',
    ],
    [
      { messageType: 'text', content: undefined as any, hasAttachment: false },
      'New message',
    ],
    [
      {
        messageType: 'TEXT',
        content: '  Hello there  ',
        hasAttachment: false,
      },
      'Hello there',
    ],
    [
      { messageType: 'audio', content: 'ignored', hasAttachment: false },
      'Audio message',
    ],
    [
      { messageType: 'image', content: 'ignored', hasAttachment: false },
      'Photo',
    ],
    [
      {
        messageType: 'document',
        content: '',
        hasAttachment: true,
        attachmentFilename: 'résumé.pdf',
      },
      'résumé.pdf',
    ],
    [
      { messageType: 'document', content: '', hasAttachment: true },
      'Attachment',
    ],
    [{ messageType: 'call', content: '', hasAttachment: false }, 'Call'],
    [{ messageType: 'text', content: '', hasAttachment: true }, 'Attachment'],
    [
      {
        messageType: 'text',
        content: '',
        hasAttachment: true,
        attachmentFilename: 'photo.png',
      },
      'photo.png',
    ],
  ])('formats notification preview %#', (params, expected) => {
    expect(buildChatNotificationPreview(params)).toBe(expected);
  });

  it('truncates long text at 140 characters', () => {
    const content = 'x'.repeat(141);
    const result = buildChatNotificationPreview({
      messageType: 'text',
      content,
      hasAttachment: false,
    });

    expect(result).toBe(`${'x'.repeat(140)}...`);
  });
});
