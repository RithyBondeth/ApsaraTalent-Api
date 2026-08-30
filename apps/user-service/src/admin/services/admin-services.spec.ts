import { EAdminAction } from '@app/common/database/enums/admin-action.enum';
import { EReportStatus } from '@app/common/database/enums/report-status.enum';
import { EUserRole } from '@app/common/database/enums/user-role.enum';
import { EUserStatus } from '@app/common/database/enums/user-status.enum';
import { RpcException } from '@nestjs/microservices';
import { AdminReportService } from './admin-report.service';
import { AdminUserService } from './admin-user.service';

const DAY = 24 * 60 * 60 * 1000;

async function expectRpc(
  promise: Promise<unknown>,
  statusCode: number,
  matcher: string | RegExp,
) {
  const error = (await promise.catch((caught) => caught)) as RpcException;
  expect(error).toBeInstanceOf(RpcException);
  const payload = error.getError() as { statusCode: number; message: string };
  expect(payload.statusCode).toBe(statusCode);
  expect(payload.message).toEqual(expect.stringMatching(matcher));
}

describe('AdminUserService', () => {
  const users = {
    count: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    createQueryBuilder: jest.fn(),
  };
  const reports = {
    count: jest.fn(),
    find: jest.fn(),
    createQueryBuilder: jest.fn(),
  };
  const audit = { find: jest.fn() };
  const auditService = { record: jest.fn() };
  const redis = { invalidateAuthSession: jest.fn() };
  const logger = { setContext: jest.fn(), info: jest.fn(), error: jest.fn() };

  const service = new AdminUserService(
    users as any,
    reports as any,
    audit as any,
    auditService as any,
    redis as any,
    logger as any,
  );

  const target = {
    id: 'user-2',
    role: EUserRole.EMPLOYEE,
    status: EUserStatus.ACTIVE,
    email: 'them@example.com',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    users.findOne.mockResolvedValue(target);
    users.update.mockResolvedValue({ affected: 1 });
  });

  const suspend = (overrides: Record<string, unknown> = {}) =>
    service.updateUserStatus({
      actorId: 'admin-1',
      userId: 'user-2',
      status: EUserStatus.SUSPENDED,
      reason: 'Repeated spam applications',
      ...overrides,
    } as any);

  it('refuses to let an admin act on their own account', async () => {
    // A slip here could lock the last administrator out of the platform.
    await expectRpc(suspend({ actorId: 'user-2' }), 400, /your own account/);
    expect(users.update).not.toHaveBeenCalled();
  });

  it('refuses to suspend another administrator from the panel', async () => {
    // One compromised admin session must not be able to disable every other
    // administrator; demotion is a shell operation on purpose.
    users.findOne.mockResolvedValue({ ...target, role: EUserRole.ADMIN });
    await expectRpc(suspend(), 403, /Administrator accounts cannot/);
    expect(users.update).not.toHaveBeenCalled();
  });

  it('404s on an account that does not exist', async () => {
    users.findOne.mockResolvedValue(null);
    await expectRpc(suspend(), 404, /does not exist/);
  });

  it('writes the audit row before reporting success', async () => {
    await suspend();
    expect(auditService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: 'admin-1',
        action: EAdminAction.USER_SUSPENDED,
        targetUserId: 'user-2',
        reason: 'Repeated spam applications',
      }),
    );
  });

  it('fails the action when the audit row cannot be written', async () => {
    // An unlogged suspension is worse than a suspension that did not happen.
    auditService.record.mockRejectedValueOnce(new Error('audit table down'));
    await expectRpc(suspend(), 500, /error occurred/);
  });

  it('drops the cached session so the suspension bites immediately', async () => {
    // AuthGuard caches the session for two minutes; without this the account
    // keeps working for up to that long after being suspended.
    await suspend();
    expect(redis.invalidateAuthSession).toHaveBeenCalledWith('user-2');
  });

  it('records the status it moved from as well as to', async () => {
    users.findOne.mockResolvedValue({
      ...target,
      status: EUserStatus.SUSPENDED,
    });
    await service.updateUserStatus({
      actorId: 'admin-1',
      userId: 'user-2',
      status: EUserStatus.ACTIVE,
      reason: 'Appeal upheld on review',
    } as any);

    expect(auditService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: EAdminAction.USER_REINSTATED,
        metadata: expect.objectContaining({
          from: EUserStatus.SUSPENDED,
          to: EUserStatus.ACTIVE,
        }),
      }),
    );
  });

  it('clears the reason and the expiry when reinstating', async () => {
    // Leaving either behind would make a reinstated account read as suspended
    // on the next admin who opens it.
    await service.updateUserStatus({
      actorId: 'admin-1',
      userId: 'user-2',
      status: EUserStatus.ACTIVE,
      reason: 'Appeal upheld on review',
    } as any);

    expect(users.update).toHaveBeenCalledWith(
      { id: 'user-2' },
      expect.objectContaining({
        status: EUserStatus.ACTIVE,
        suspendedUntil: null,
        statusReason: null,
      }),
    );
  });

  it('rejects an end date on a permanent ban rather than ignoring it', async () => {
    await expectRpc(
      suspend({
        status: EUserStatus.BANNED,
        suspendedUntil: new Date(Date.now() + DAY).toISOString(),
      }),
      400,
      /only applies to a suspension/,
    );
  });

  it('rejects a suspension that ends in the past', async () => {
    await expectRpc(
      suspend({ suspendedUntil: new Date(Date.now() - DAY).toISOString() }),
      400,
      /must end in the future/,
    );
  });

  it('stores a valid suspension expiry', async () => {
    const until = new Date(Date.now() + 3 * DAY).toISOString();
    await suspend({ suspendedUntil: until });
    expect(users.update).toHaveBeenCalledWith(
      { id: 'user-2' },
      expect.objectContaining({ suspendedUntil: new Date(until) }),
    );
  });

  it('counts open reports for a whole page in one query', async () => {
    // A count per row would be one query per user on every page of the list.
    const raw = [{ userId: 'user-2', count: '3' }];
    const builder = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([
        [
          {
            id: 'user-2',
            role: EUserRole.EMPLOYEE,
            status: EUserStatus.ACTIVE,
            createdAt: new Date(),
            isEmailVerified: true,
            profileCompleted: true,
          },
        ],
        1,
      ]),
    };
    const reportBuilder = {
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue(raw),
    };
    users.createQueryBuilder.mockReturnValue(builder);
    reports.createQueryBuilder.mockReturnValue(reportBuilder);

    const page = await service.listUsers({ page: 1, limit: 25 } as any);

    expect(reports.createQueryBuilder).toHaveBeenCalledTimes(1);
    expect(page.items[0].openReportCount).toBe(3);
  });

  it('reports an expired suspension as active while keeping the stored value', async () => {
    // The two fields answer different questions: what the platform enforces
    // now, and what an admin actually decided.
    users.findOne.mockResolvedValue({
      id: 'user-2',
      role: EUserRole.EMPLOYEE,
      status: EUserStatus.SUSPENDED,
      suspendedUntil: new Date(Date.now() - DAY),
      createdAt: new Date(),
      isEmailVerified: true,
      profileCompleted: true,
    });
    reports.find.mockResolvedValue([]);
    audit.find.mockResolvedValue([]);
    reports.createQueryBuilder.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([]),
    });

    const detail = await service.getUser({ userId: 'user-2' });
    expect(detail.status).toBe(EUserStatus.ACTIVE);
    expect(detail.storedStatus).toBe(EUserStatus.SUSPENDED);
  });
});

describe('AdminReportService', () => {
  const reports = {
    findAndCount: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
  };
  const audit = { findAndCount: jest.fn() };
  const auditService = { record: jest.fn() };
  const logger = { setContext: jest.fn(), info: jest.fn(), error: jest.fn() };

  const service = new AdminReportService(
    reports as any,
    audit as any,
    auditService as any,
    logger as any,
  );

  beforeEach(() => jest.clearAllMocks());

  it('works the queue oldest-first', async () => {
    // This is a work queue: the report that has waited longest is next.
    reports.findAndCount.mockResolvedValue([[], 0]);
    await service.listReports({} as any);
    expect(reports.findAndCount).toHaveBeenCalledWith(
      expect.objectContaining({ order: { createdAt: 'ASC' } }),
    );
  });

  it('moves a report off pending and records who did it', async () => {
    // EReportStatus had no writer at all before this service existed: every
    // report ever filed sat at PENDING forever.
    reports.findOne.mockResolvedValue({
      id: 'report-1',
      status: EReportStatus.PENDING,
      reported: { id: 'user-2' },
    });

    await service.updateReportStatus({
      actorId: 'admin-1',
      reportId: 'report-1',
      status: EReportStatus.RESOLVED,
      note: 'Account suspended for 7 days',
    } as any);

    expect(reports.update).toHaveBeenCalledWith(
      { id: 'report-1' },
      { status: EReportStatus.RESOLVED },
    );
    expect(auditService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: EAdminAction.REPORT_STATUS_CHANGED,
        targetReportId: 'report-1',
        // Also against the reported account, so the account detail page shows
        // the whole story in one place.
        targetUserId: 'user-2',
      }),
    );
  });

  it('does not write a second audit row for a no-op transition', async () => {
    reports.findOne.mockResolvedValue({
      id: 'report-1',
      status: EReportStatus.RESOLVED,
      reported: { id: 'user-2' },
    });

    const result = await service.updateReportStatus({
      actorId: 'admin-1',
      reportId: 'report-1',
      status: EReportStatus.RESOLVED,
    } as any);

    expect(result.message).toMatch(/already resolved/);
    expect(reports.update).not.toHaveBeenCalled();
    expect(auditService.record).not.toHaveBeenCalled();
  });

  it('404s on a report that does not exist', async () => {
    reports.findOne.mockResolvedValue(null);
    await expectRpc(
      service.updateReportStatus({
        actorId: 'admin-1',
        reportId: 'missing',
        status: EReportStatus.DISMISSED,
      } as any),
      404,
      /does not exist/,
    );
  });
});
