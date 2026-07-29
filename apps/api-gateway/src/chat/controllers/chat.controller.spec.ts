import 'reflect-metadata';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { CHAT_SERVICE } from '@app/contracts';
import { serveStorageObject } from '@app/common';
import { rpcCall } from '../../utils/rpc-call';
import { ChatController } from './chat.controller';

jest.mock('../../utils/rpc-call', () => ({ rpcCall: jest.fn() }));
jest.mock('@app/common', () => ({
  ...jest.requireActual('@app/common'),
  serveStorageObject: jest.fn(),
}));

describe('ChatController', () => {
  const client = {};
  const storage = { exists: jest.fn() };
  const controller = new ChatController(client as any, storage as any);
  const rpc = rpcCall as jest.Mock;

  beforeEach(() => jest.clearAllMocks());

  it('initiates and lists chats using the authenticated user', async () => {
    rpc.mockResolvedValue([]);
    await controller.initiateChat({ receiverId: 'receiver-1' } as any, {
      user: { id: 'sender-1' },
    });
    expect(rpc).toHaveBeenLastCalledWith(
      client,
      CHAT_SERVICE.ACTIONS.CREATE_OR_GET_CHAT,
      { senderId: 'sender-1', receiverId: 'receiver-1' },
    );
    await controller.getRecentChats({ user: { id: 'sender-1' } });
    expect(rpc).toHaveBeenLastCalledWith(
      client,
      CHAT_SERVICE.ACTIONS.GET_RECENT_CHATS,
      'sender-1',
    );
  });

  it('does not swallow recent-chat service failures', async () => {
    const error = new Error('service unavailable');
    rpc.mockRejectedValue(error);
    await expect(
      controller.getRecentChats({ user: { id: 'user-1' } }),
    ).rejects.toBe(error);
  });

  it.each([
    ['image/png', 'image'],
    ['audio/mpeg', 'audio'],
    ['application/pdf', 'document'],
  ])('classifies uploaded %s attachments as %s', async (mimetype, type) => {
    jest.useFakeTimers().setSystemTime(new Date('2026-07-23T12:00:00Z'));
    const result = await controller.uploadAttachment({
      filename: 'stored-file',
      originalname: 'file.bin',
      mimetype,
      size: 42,
    } as Express.Multer.File);
    expect(result).toMatchObject({
      url: '/chat/attachment/2026-07-23/stored-file',
      type,
      filename: 'file.bin',
      size: 42,
    });
    jest.useRealTimers();
  });

  it('rejects a missing attachment upload', async () => {
    await expect(
      controller.uploadAttachment(undefined as any),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it.each([
    ['bad-date', 'file.pdf'],
    ['2026-07-23', '../file.pdf'],
  ])('rejects unsafe attachment paths', async (date, filename) => {
    await expect(
      controller.getAttachment(
        date,
        filename,
        { user: { id: 'user-1' } },
        {} as any,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('supports legacy storage attachment URLs before serving a file', async () => {
    rpc
      .mockResolvedValueOnce({ canAccess: false })
      .mockResolvedValueOnce({ canAccess: true });
    storage.exists.mockResolvedValue(true);
    const res = {} as any;
    await controller.getAttachment(
      '2026-07-23',
      'file.pdf',
      { user: { id: 'user-1' } },
      res,
    );
    expect(rpc).toHaveBeenNthCalledWith(
      2,
      client,
      CHAT_SERVICE.ACTIONS.CAN_ACCESS_ATTACHMENT,
      {
        userId: 'user-1',
        attachment: '/storage/chat/2026-07-23/file.pdf',
      },
    );
    expect(serveStorageObject).toHaveBeenCalledWith(
      res,
      storage,
      'chat/2026-07-23/file.pdf',
      { cacheControl: 'private, no-store' },
    );
  });

  it('rejects unauthorized and missing attachments', async () => {
    rpc.mockResolvedValue({ canAccess: false });
    await expect(
      controller.getAttachment(
        '2026-07-23',
        'file.pdf',
        { user: { id: 'user-1' } },
        {} as any,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);

    rpc.mockResolvedValue({ canAccess: true });
    storage.exists.mockResolvedValue(false);
    await expect(
      controller.getAttachment(
        '2026-07-23',
        'file.pdf',
        { user: { id: 'user-1' } },
        {} as any,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
