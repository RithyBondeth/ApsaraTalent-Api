import { resolveUserId } from '@app/common';
import { EReportReason } from '@app/common/database/enums/report-reason.enum';
import { RpcException } from '@nestjs/microservices';
import { ModerationService } from './moderation.service';

jest.mock('@app/common', () => ({ resolveUserId: jest.fn() }));

describe('ModerationService', () => {
  const blocks = {
    findOne: jest.fn(),
    find: jest.fn(),
    exists: jest.fn(),
    create: jest.fn((data) => data),
    save: jest.fn(),
    createQueryBuilder: jest.fn(),
  };
  const reports = {
    create: jest.fn((data) => data),
    save: jest.fn(),
  };
  const users = { find: jest.fn() };
  const logger = { setContext: jest.fn(), info: jest.fn(), error: jest.fn() };
  const redis = { delPattern: jest.fn() };
  const service = new ModerationService(
    blocks as any,
    reports as any,
    users as any,
    logger as any,
    redis as any,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    (resolveUserId as jest.Mock).mockImplementation(async (_repo, id) => id);
  });

  async function expectRpc(
    promise: Promise<unknown>,
    statusCode: number,
    message: string,
  ) {
    const error = (await promise.catch((caught) => caught)) as RpcException;
    expect(error).toBeInstanceOf(RpcException);
    expect(error.getError()).toEqual({ statusCode, message });
  }

  it('prevents self-blocking', async () => {
    await expectRpc(
      service.blockUser({ blockerId: 'user-1', blockedId: 'user-1' }),
      400,
      'You cannot block yourself.',
    );
  });

  it('returns a clear error when the block target does not exist', async () => {
    (resolveUserId as jest.Mock)
      .mockResolvedValueOnce('user-1')
      .mockRejectedValueOnce(new Error('missing'));
    await expectRpc(
      service.blockUser({ blockerId: 'user-1', blockedId: 'missing' }),
      404,
      'The user you are trying to block does not exist.',
    );
  });

  it('creates a block and invalidates all discovery feeds', async () => {
    blocks.findOne.mockResolvedValue(null);
    blocks.save.mockResolvedValue({ id: 'block-1' });

    const result = await service.blockUser({
      blockerId: 'user-1',
      blockedId: 'user-2',
    });

    expect(blocks.create).toHaveBeenCalledWith({
      blocker: { id: 'user-1' },
      blocked: { id: 'user-2' },
    });
    expect(redis.delPattern).toHaveBeenCalledTimes(4);
    expect(result.blocked).toBe(true);
  });

  it('treats an existing block as idempotent', async () => {
    blocks.findOne.mockResolvedValue({ id: 'block-1' });
    await service.blockUser({ blockerId: 'user-1', blockedId: 'user-2' });
    expect(blocks.save).not.toHaveBeenCalled();
    expect(redis.delPattern).not.toHaveBeenCalled();
  });

  it('unblocks by explicit foreign-key columns and refreshes feeds', async () => {
    const execute = jest.fn().mockResolvedValue({ affected: 1 });
    const qb = {
      delete: jest.fn(),
      where: jest.fn(),
      execute,
    };
    qb.delete.mockReturnValue(qb);
    qb.where.mockReturnValue(qb);
    blocks.createQueryBuilder.mockReturnValue(qb);

    const result = await service.unblockUser({
      blockerId: 'user-1',
      blockedId: 'user-2',
    });

    expect(qb.where).toHaveBeenCalledWith(
      '"blockerId" = :blockerId AND "blockedId" = :blockedId',
      { blockerId: 'user-1', blockedId: 'user-2' },
    );
    expect(redis.delPattern).toHaveBeenCalledTimes(4);
    expect(result.blocked).toBe(false);
  });

  it('lists blocked users with display identity and fallback avatar', async () => {
    blocks.find.mockResolvedValue([
      {
        createdAt: new Date('2026-01-01'),
        blocked: {
          id: 'user-2',
          role: 'employee',
          employee: {
            id: 'employee-2',
            firstname: 'Sok',
            lastname: 'Dara',
          },
        },
      },
      { blocked: null },
    ]);

    const result = await service.listBlockedUsers({ blockerId: 'user-1' });
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(
      expect.objectContaining({
        id: 'user-2',
        employeeId: 'employee-2',
        name: 'Sok Dara',
      }),
    );
  });

  it('reports block status in both directions', async () => {
    blocks.exists.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    const result = await service.getBlockStatus({
      userId: 'user-1',
      otherUserId: 'user-2',
    });
    expect(result).toEqual(
      expect.objectContaining({
        isBlocked: true,
        blockedByMe: false,
        blockedMe: true,
      }),
    );
  });

  it('returns hidden employee and company profile ids in either direction', async () => {
    const qb: Record<string, jest.Mock> = {};
    for (const method of ['select', 'addSelect', 'where']) {
      qb[method] = jest.fn(() => qb);
    }
    qb.getRawMany = jest.fn().mockResolvedValue([
      { blockerId: 'user-1', blockedId: 'user-2' },
      { blockerId: 'user-3', blockedId: 'user-1' },
    ]);
    blocks.createQueryBuilder.mockReturnValue(qb);
    users.find.mockResolvedValue([
      { employee: { id: 'employee-2' } },
      { company: { id: 'company-3' } },
    ]);

    await expect(
      service.getHiddenProfileIds({ requesterId: 'user-1' }),
    ).resolves.toEqual(['employee-2', 'company-3']);
  });

  it('prevents self-reporting and missing report targets', async () => {
    await expectRpc(
      service.reportUser({
        reporterId: 'user-1',
        reportedId: 'user-1',
        reason: EReportReason.SPAM,
      }),
      400,
      'You cannot report yourself.',
    );
  });

  it('stores a report without trusting embedded user objects', async () => {
    reports.save.mockResolvedValue({ id: 'report-1' });
    const result = await service.reportUser({
      reporterId: 'user-1',
      reportedId: 'user-2',
      reason: EReportReason.SPAM,
      details: 'Repeated messages',
    });

    expect(reports.create).toHaveBeenCalledWith({
      reporter: { id: 'user-1' },
      reported: { id: 'user-2' },
      reason: EReportReason.SPAM,
      details: 'Repeated messages',
    });
    expect(result.reportId).toBe('report-1');
  });

  it('fails closed for actions but safely hides nothing on feed lookup failure', async () => {
    (resolveUserId as jest.Mock).mockRejectedValue(new Error('database down'));
    await expect(
      service.getHiddenProfileIds({ requesterId: 'user-1' }),
    ).resolves.toEqual([]);
    await expectRpc(
      service.getBlockStatus({ userId: 'user-1', otherUserId: 'user-2' }),
      500,
      'An error occurred while checking block status.',
    );
  });

  it('wraps block persistence and feed invalidation failures', async () => {
    blocks.findOne.mockRejectedValueOnce(new Error('block lookup failed'));
    await expectRpc(
      service.blockUser({ blockerId: 'user-1', blockedId: 'user-2' }),
      500,
      'An error occurred while blocking the user.',
    );

    blocks.findOne.mockResolvedValueOnce(null);
    blocks.save.mockResolvedValueOnce({ id: 'block-1' });
    redis.delPattern.mockRejectedValueOnce(new Error('cache failed'));
    await expectRpc(
      service.blockUser({ blockerId: 'user-1', blockedId: 'user-2' }),
      500,
      'An error occurred while blocking the user.',
    );
  });

  it('does not invalidate feeds when unblock removes no rows', async () => {
    const qb: any = {};
    qb.delete = jest.fn(() => qb);
    qb.where = jest.fn(() => qb);
    qb.execute = jest.fn().mockResolvedValue({ affected: 0 });
    blocks.createQueryBuilder.mockReturnValue(qb);
    await service.unblockUser({ blockerId: 'user-1', blockedId: 'user-2' });
    expect(redis.delPattern).not.toHaveBeenCalled();
  });

  it('wraps unblock and blocked-list failures', async () => {
    blocks.createQueryBuilder.mockImplementationOnce(() => {
      throw new Error('delete failed');
    });
    await expectRpc(
      service.unblockUser({ blockerId: 'user-1', blockedId: 'user-2' }),
      500,
      'An error occurred while unblocking the user.',
    );

    blocks.find.mockRejectedValueOnce(new Error('list failed'));
    await expectRpc(
      service.listBlockedUsers({ blockerId: 'user-1' }),
      500,
      'An error occurred while loading blocked users.',
    );
  });

  it('formats company and unknown blocked identities', async () => {
    blocks.find.mockResolvedValue([
      {
        blocked: {
          id: 'company-user',
          role: 'company',
          company: { id: 'company-1', name: 'Apsara', avatar: 'logo.png' },
        },
      },
      { blocked: { id: 'unknown', role: 'employee' } },
    ]);
    const result = await service.listBlockedUsers({ blockerId: 'user-1' });
    expect(result[0]).toEqual(
      expect.objectContaining({ name: 'Apsara', avatar: 'logo.png' }),
    );
    expect(result[1]).toEqual(expect.objectContaining({ name: 'Unknown' }));
  });

  it('rejects a missing report target and wraps report persistence failures', async () => {
    (resolveUserId as jest.Mock)
      .mockResolvedValueOnce('user-1')
      .mockRejectedValueOnce(new Error('missing'));
    await expectRpc(
      service.reportUser({
        reporterId: 'user-1',
        reportedId: 'missing',
        reason: EReportReason.SPAM,
      }),
      404,
      'The user you are trying to report does not exist.',
    );

    reports.save.mockRejectedValueOnce(new Error('report failed'));
    await expectRpc(
      service.reportUser({
        reporterId: 'user-1',
        reportedId: 'user-2',
        reason: EReportReason.SPAM,
      }),
      500,
      'An error occurred while submitting the report.',
    );
    expect(reports.create).toHaveBeenLastCalledWith(
      expect.objectContaining({ details: null }),
    );
  });
});
