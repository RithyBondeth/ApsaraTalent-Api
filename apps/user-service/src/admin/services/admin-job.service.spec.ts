import { EAdminAction } from '@app/common/database/enums/admin-action.enum';
import { RpcException } from '@nestjs/microservices';
import { AdminJobService } from './admin-job.service';

async function expectRpc(
  promise: Promise<unknown>,
  statusCode: number,
  matcher: RegExp,
) {
  const error = (await promise.catch((caught) => caught)) as RpcException;
  expect(error).toBeInstanceOf(RpcException);
  const payload = error.getError() as { statusCode: number; message: string };
  expect(payload.statusCode).toBe(statusCode);
  expect(payload.message).toEqual(expect.stringMatching(matcher));
}

describe('AdminJobService', () => {
  const jobs = {
    findOne: jest.fn(),
    manager: {},
    update: jest.fn(),
    softDelete: jest.fn(),
    restore: jest.fn(),
    createQueryBuilder: jest.fn(),
  };
  const reports = { createQueryBuilder: jest.fn() };
  const auditService = { record: jest.fn() };
  const cacheInvalidation = { invalidateCompanyCache: jest.fn() };
  const logger = { setContext: jest.fn(), info: jest.fn(), error: jest.fn() };

  const service = new AdminJobService(
    jobs as any,
    reports as any,
    auditService as any,
    cacheInvalidation as any,
    logger as any,
  );

  const visibleJob = {
    id: 'job-1',
    title: 'React Developer',
    hiddenAt: null,
    hiddenReason: null,
    company: { id: 'company-1', name: 'Acme', user: { id: 'user-9' } },
  };

  // loadJob() goes through a query builder; listJobs() builds its own.
  let loadBuilder: any;
  beforeEach(() => {
    jest.clearAllMocks();
    loadBuilder = {
      withDeleted: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(visibleJob),
    };
    jobs.createQueryBuilder.mockReturnValue(loadBuilder);
  });

  const hide = (overrides: Record<string, unknown> = {}) =>
    service.hideJob({
      actorId: 'admin-1',
      jobId: 'job-1',
      reason: 'Fraudulent listing, asks candidates for a fee',
      ...overrides,
    } as any);

  it('takes the posting down with softDelete, not a status flag', async () => {
    // softDelete is what makes it disappear from the ~15 read paths that
    // reach jobs through company.openPositions without any of them changing.
    await hide();
    expect(jobs.softDelete).toHaveBeenCalledWith('job-1');
  });

  it('records the reason and actor before hiding', async () => {
    // softDelete() only stamps hiddenAt; it does not carry our own columns,
    // so they have to be written separately or the takedown is unattributed.
    await hide();
    expect(jobs.update).toHaveBeenCalledWith(
      { id: 'job-1' },
      expect.objectContaining({
        hiddenReason: 'Fraudulent listing, asks candidates for a fee',
        hiddenBy: 'admin-1',
      }),
    );
  });

  it('looks the posting up with withDeleted, and joins the company explicitly', async () => {
    // withDeleted so restore can reach the rows it exists for. An explicit
    // join because relationLoadStrategy:'query' returns no company for a
    // soft-deleted row, which silently broke restore's cache invalidation.
    await hide();
    expect(loadBuilder.withDeleted).toHaveBeenCalled();
    expect(loadBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
      'job.company',
      'company',
    );
  });

  it('audits against the company account, not just the job', async () => {
    await hide();
    expect(auditService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: EAdminAction.JOB_HIDDEN,
        targetUserId: 'user-9',
        metadata: expect.objectContaining({
          jobId: 'job-1',
          jobTitle: 'React Developer',
        }),
      }),
    );
  });

  it('clears the caches that would keep serving the posting', async () => {
    // Reuses the same invalidation a company add/remove triggers. A bespoke
    // set here missed user:detail, which also embeds openPositions, and a
    // restored posting stayed invisible until the TTL expired.
    await hide();
    expect(cacheInvalidation.invalidateCompanyCache).toHaveBeenCalledWith(
      'company-1',
    );
  });

  it('fails the takedown when the audit row cannot be written', async () => {
    auditService.record.mockRejectedValueOnce(new Error('audit down'));
    await expectRpc(hide(), 500, /error occurred/);
  });

  it('no-ops on an already hidden posting', async () => {
    loadBuilder.getOne.mockResolvedValue({
      ...visibleJob,
      hiddenAt: new Date(),
    });
    const result = await hide();
    expect(result.message).toMatch(/already hidden/);
    expect(jobs.softDelete).not.toHaveBeenCalled();
    expect(auditService.record).not.toHaveBeenCalled();
  });

  it('404s on a posting that does not exist', async () => {
    loadBuilder.getOne.mockResolvedValue(null);
    await expectRpc(hide(), 404, /does not exist/);
  });

  it('restores and clears the takedown notice', async () => {
    // Leaving the reason behind would keep showing the company a notice for
    // a decision that was reversed.
    loadBuilder.getOne.mockResolvedValue({
      ...visibleJob,
      hiddenAt: new Date(),
      hiddenReason: 'Reported as a scam',
    });

    await service.restoreJob({ actorId: 'admin-1', jobId: 'job-1' } as any);

    expect(jobs.restore).toHaveBeenCalledWith('job-1');
    expect(jobs.update).toHaveBeenCalledWith(
      { id: 'job-1' },
      { hiddenReason: null, hiddenBy: null },
    );
    expect(auditService.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: EAdminAction.JOB_RESTORED }),
    );
  });

  it('no-ops on an already visible posting', async () => {
    const result = await service.restoreJob({
      actorId: 'admin-1',
      jobId: 'job-1',
    } as any);
    expect(result.message).toMatch(/already visible/);
    expect(jobs.restore).not.toHaveBeenCalled();
  });

  describe('listJobs', () => {
    const builder = () => ({
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      withDeleted: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    });

    it('shows only live postings by default', async () => {
      // The default view is the queue an admin works; a page of postings they
      // already removed is something you ask for.
      const qb = builder();
      jobs.createQueryBuilder.mockReturnValue(qb);
      await service.listJobs({} as any);
      expect(qb.withDeleted).not.toHaveBeenCalled();
    });

    it('lifts the filter when asked for hidden postings', async () => {
      const qb = builder();
      jobs.createQueryBuilder.mockReturnValue(qb);
      await service.listJobs({ visibility: 'hidden' } as any);
      expect(qb.withDeleted).toHaveBeenCalled();
      expect(qb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('IS NOT NULL'),
      );
    });

    it('lifts the filter without narrowing when asked for all', async () => {
      const qb = builder();
      jobs.createQueryBuilder.mockReturnValue(qb);
      await service.listJobs({ visibility: 'all' } as any);
      expect(qb.withDeleted).toHaveBeenCalled();
      expect(qb.andWhere).not.toHaveBeenCalledWith(
        expect.stringContaining('IS NOT NULL'),
      );
    });
  });
});
