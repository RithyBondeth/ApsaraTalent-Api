import { EAdminAction } from '@app/common/database/enums/admin-action.enum';
import { EProblemCategory } from '@app/common/database/enums/problem-category.enum';
import { EReportStatus } from '@app/common/database/enums/report-status.enum';
import { EUserRole } from '@app/common/database/enums/user-role.enum';
import { RpcException } from '@nestjs/microservices';
import { AdminProblemReportService } from './admin-problem-report.service';

describe('AdminProblemReportService', () => {
  const repo = {
    findAndCount: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
  };
  const audit = { record: jest.fn() };
  const logger = { setContext: jest.fn(), error: jest.fn() };

  const service = new AdminProblemReportService(
    repo as any,
    audit as any,
    logger as any,
  );

  const row = (overrides: Record<string, unknown> = {}) => ({
    id: 'report-1',
    category: EProblemCategory.BUG,
    details: 'Something broke on /jobs',
    pageUrl: '/jobs/1',
    userAgent: 'Chrome',
    status: EReportStatus.PENDING,
    resolutionNote: null,
    createdAt: new Date('2026-08-01T00:00:00.000Z'),
    reporter: {
      id: 'user-1',
      email: 'reporter@example.com',
      role: EUserRole.EMPLOYEE,
    },
    ...overrides,
  });

  beforeEach(() => jest.clearAllMocks());

  describe('listReports', () => {
    it('returns the queue oldest first with a mapped shape', async () => {
      repo.findAndCount.mockResolvedValue([[row()], 1]);

      const result = await service.listReports({ page: 1, limit: 20 });

      expect(repo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ order: { createdAt: 'ASC' } }),
      );
      expect(result.total).toBe(1);
      expect(result.items[0]).toMatchObject({
        id: 'report-1',
        category: EProblemCategory.BUG,
        reporter: { id: 'user-1', email: 'reporter@example.com' },
      });
    });

    it('filters by status and category when supplied', async () => {
      repo.findAndCount.mockResolvedValue([[], 0]);

      await service.listReports({
        page: 1,
        limit: 20,
        status: EReportStatus.PENDING,
        category: EProblemCategory.PAYMENT,
      });

      expect(repo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            status: EReportStatus.PENDING,
            category: EProblemCategory.PAYMENT,
          },
        }),
      );
    });

    it('renders reporter as null when the account has been deleted', async () => {
      repo.findAndCount.mockResolvedValue([[row({ reporter: null })], 1]);

      const result = await service.listReports({ page: 1, limit: 20 });

      // The FK is SET NULL on purpose: the report survives even when the
      // reporter deletes their account. The admin still needs to see it.
      expect(result.items[0].reporter).toBeNull();
    });

    it('wraps repo failures as RPC errors', async () => {
      repo.findAndCount.mockRejectedValue(new Error('database unavailable'));

      await expect(
        service.listReports({ page: 1, limit: 20 }),
      ).rejects.toBeInstanceOf(RpcException);
    });
  });

  describe('updateStatus', () => {
    it('rejects unknown ids with a 404', async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(
        service.updateStatus({
          reportId: 'report-1',
          actorId: 'admin-1',
          status: EReportStatus.REVIEWED,
        }),
      ).rejects.toBeInstanceOf(RpcException);
    });

    it('is a no-op when the status has not changed', async () => {
      repo.findOne.mockResolvedValue(row());

      await service.updateStatus({
        reportId: 'report-1',
        actorId: 'admin-1',
        status: EReportStatus.PENDING,
      });

      expect(repo.update).not.toHaveBeenCalled();
      expect(audit.record).not.toHaveBeenCalled();
    });

    it('writes the new status, the note, and an audit entry', async () => {
      repo.findOne.mockResolvedValue(row());

      await service.updateStatus({
        reportId: 'report-1',
        actorId: 'admin-1',
        status: EReportStatus.RESOLVED,
        note: 'Fixed in v1.2.3',
      });

      expect(repo.update).toHaveBeenCalledWith(
        { id: 'report-1' },
        expect.objectContaining({
          status: EReportStatus.RESOLVED,
          resolutionNote: 'Fixed in v1.2.3',
        }),
      );
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId: 'admin-1',
          action: EAdminAction.REPORT_STATUS_CHANGED,
          // Problem reports are not about a user — the reporter is not the
          // target of the action.
          targetUserId: null,
          targetReportId: 'report-1',
          // The audit reader disambiguates via metadata — the alternative was
          // an irreversible enum-value migration.
          metadata: expect.objectContaining({
            reportKind: 'problem_report',
            from: EReportStatus.PENDING,
            to: EReportStatus.RESOLVED,
          }),
        }),
      );
    });
  });
});
