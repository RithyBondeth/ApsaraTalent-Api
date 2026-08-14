import { ChatQueryService } from './chat-query.service';

describe('chat attachment access', () => {
  const chatRepository = { findOne: jest.fn() };
  const queryService = Object.create(
    ChatQueryService.prototype,
  ) as ChatQueryService;
  (queryService as any).chatRepository = chatRepository;

  beforeEach(() => jest.clearAllMocks());

  it('allows only a message participant', async () => {
    chatRepository.findOne.mockResolvedValue({
      sender: { id: 'sender-1' },
      receiver: { id: 'receiver-1' },
    });

    await expect(
      queryService.canAccessAttachment(
        'sender-1',
        '/chat/attachment/2026-07-13/file.pdf',
      ),
    ).resolves.toBe(true);
    await expect(
      queryService.canAccessAttachment(
        'stranger-1',
        '/chat/attachment/2026-07-13/file.pdf',
      ),
    ).resolves.toBe(false);
  });

  it('rejects an attachment that is not associated with a message', async () => {
    chatRepository.findOne.mockResolvedValue(null);

    await expect(
      queryService.canAccessAttachment(
        'sender-1',
        '/chat/attachment/2026-07-13/missing.pdf',
      ),
    ).resolves.toBe(false);
  });
});
