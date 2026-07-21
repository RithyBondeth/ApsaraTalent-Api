import { ForbiddenException } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { of } from 'rxjs';
import { ChatController } from './chat.controller';
import { StorageService } from '@app/common';

describe('ChatController attachment access', () => {
  const chatClient = {
    send: jest.fn(),
  } as unknown as ClientProxy;
  // The attachment-access tests all assert on the authorization outcome, which
  // is decided before storage is ever touched.
  const storageService = {
    exists: jest.fn().mockResolvedValue(true),
    getUrl: jest.fn().mockResolvedValue(null),
    isPublic: jest.fn().mockReturnValue(false),
  } as unknown as StorageService;
  const controller = new ChatController(chatClient, storageService);

  beforeEach(() => jest.clearAllMocks());

  it('rejects a typed RPC response that denies both current and legacy paths', async () => {
    (chatClient.send as jest.Mock)
      .mockReturnValueOnce(of({ canAccess: false }))
      .mockReturnValueOnce(of({ canAccess: false }));

    await expect(
      controller.getAttachment(
        '2026-07-13',
        'c5a1e3cc-0123-4f7f-a930-6c1f7400d2b7.pdf',
        { user: { id: '1d7f2db1-8c0a-4c9d-a469-c6b831aab9df' } },
        {} as any,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(chatClient.send).toHaveBeenCalledTimes(2);
  });
});
