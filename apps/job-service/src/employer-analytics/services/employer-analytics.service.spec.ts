import { EApplicationStatus } from '@app/common/database/enums/application-status.enum';
import { RpcException } from '@nestjs/microservices';
import { EmployerAnalyticsService } from './employer-analytics.service';

describe('EmployerAnalyticsService', () => {
  // One QB shape used by every QB call in the service. The chain methods
  // return `this` so a caller can build up any order; the two terminals
  // (`getCount` and `getRawMany`) are per-test overrides.
  //
  // A single shared QB is enough because each Promise.all branch calls the
  // methods it needs and each terminal is fed by the test via
  // `getCount.mockResolvedValueOnce(...)` in call order — that matches the
  // order the service invokes them, which is the order of the Promise.all
  // array. A fresh QB per branch would look neater but forces the test to
  // simulate that call-order coupling explicitly, which is the same trap
  // the earlier version hit.
  const qb: any = {
    innerJoin: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    addGroupBy: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    getCount: jest.fn(),
    getRawMany: jest.fn(),
  };

  const applicationRepo = {
    count: jest.fn(),
    createQueryBuilder: jest.fn(() => qb),
  };
  const historyRepo = { query: jest.fn() };
  const jobRepo = {
    count: jest.fn(),
    createQueryBuilder: jest.fn(() => qb),
  };
  const companyRepo = { findOne: jest.fn() };
  const logger = { setContext: jest.fn(), error: jest.fn() };

  const service = new EmployerAnalyticsService(
    applicationRepo as any,
    historyRepo as any,
    jobRepo as any,
    companyRepo as any,
    logger as any,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    // Re-install QB defaults after clearAllMocks wipes them.
    qb.innerJoin.mockReturnThis();
    qb.leftJoin.mockReturnThis();
    qb.select.mockReturnThis();
    qb.addSelect.mockReturnThis();
    qb.where.mockReturnThis();
    qb.andWhere.mockReturnThis();
    qb.groupBy.mockReturnThis();
    qb.addGroupBy.mockReturnThis();
    qb.orderBy.mockReturnThis();
    qb.addOrderBy.mockReturnThis();
    qb.limit.mockReturnThis();
    qb.getCount.mockResolvedValue(0);
    qb.getRawMany.mockResolvedValue([]);

    applicationRepo.createQueryBuilder.mockImplementation(() => qb);
    jobRepo.createQueryBuilder.mockImplementation(() => qb);
    applicationRepo.count.mockResolvedValue(0);
    jobRepo.count.mockResolvedValue(0);
    companyRepo.findOne.mockResolvedValue({ id: 'company-1' });
    historyRepo.query.mockResolvedValue([{ median_days: null }]);
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

  it('404s an unknown company', async () => {
    companyRepo.findOne.mockResolvedValueOnce(null);
    await expectRpc(service.getAnalytics('c-x'), 404, 'Company not found');
  });

  it('reports current vs previous 30-day windows and the delta between them', async () => {
    // Two `count()` calls run inside Promise.all: current then previous. The
    // difference is what the client colours the trend chip with — negative
    // means the pipeline is drying up.
    applicationRepo.count
      .mockResolvedValueOnce(40) // applicationsCurrent
      .mockResolvedValueOnce(28); // applicationsPrevious

    const result = await service.getAnalytics('company-1');
    expect(result.applicationsDelta).toEqual({
      current: 40,
      previous: 28,
      delta: 12,
    });
  });

  it('fills every stage of the funnel, even when the row count is zero', async () => {
    // Without this the chart would silently omit a stage no candidate has
    // reached — the empty INTERVIEWING column is exactly what a recruiter
    // wants to see, not a bar that quietly disappears.
    //
    // buildFunnel is the 3rd getRawMany call in Promise.all order
    // (buildTopJobs is 4th and calls first via the jobRepo QB shared here).
    // Order-wise: activePipeline getCount, hired getCount, rejected getCount,
    // funnel getRawMany, topJobs getRawMany. Feed both getRawMany slots.
    qb.getRawMany
      .mockResolvedValueOnce([
        { status: EApplicationStatus.PENDING, count: 3 },
        { status: EApplicationStatus.HIRED, count: 1 },
      ])
      .mockResolvedValueOnce([]); // topJobs — irrelevant here

    const result = await service.getAnalytics('company-1');
    const byStatus = new Map(
      result.funnel.map((row) => [row.status, row.count]),
    );
    expect(byStatus.get(EApplicationStatus.PENDING)).toBe(3);
    expect(byStatus.get(EApplicationStatus.SHORTLISTED)).toBe(0);
    expect(byStatus.get(EApplicationStatus.INTERVIEWING)).toBe(0);
    expect(byStatus.get(EApplicationStatus.OFFERED)).toBe(0);
    expect(byStatus.get(EApplicationStatus.HIRED)).toBe(1);
    expect(byStatus.get(EApplicationStatus.REJECTED)).toBe(0);
  });

  it('orders top jobs by applicant volume and preserves per-stage breakdown', async () => {
    // buildFunnel is called first (empty), then buildTopJobs picks up this
    // one-shot. Order in Promise.all: funnel getRawMany, topJobs getRawMany.
    qb.getRawMany.mockResolvedValueOnce([]).mockResolvedValueOnce([
      {
        jobId: 'j1',
        title: 'Senior Go',
        totalApplicants: 40,
        activePipeline: 10,
        hired: 2,
        rejected: 20,
      },
      {
        jobId: 'j2',
        title: 'Product Designer',
        totalApplicants: 5,
        activePipeline: 2,
        hired: 0,
        rejected: 0,
      },
    ]);

    const result = await service.getAnalytics('company-1');
    expect(result.topJobs).toHaveLength(2);
    expect(result.topJobs[0].jobId).toBe('j1');
    expect(result.topJobs[0].totalApplicants).toBe(40);
    expect(result.topJobs[0].activePipeline).toBe(10);
    expect(result.topJobs[0].hired).toBe(2);
    expect(result.topJobs[0].rejected).toBe(20);
    expect(result.topJobs[1].totalApplicants).toBe(5);
  });

  it('returns null for the median-days metric when nothing has moved yet', async () => {
    // A brand-new company sees "—", not a fake number. `percentile_cont`
    // returns NULL over an empty set; the service preserves that as null.
    historyRepo.query.mockResolvedValueOnce([{ median_days: null }]);
    const result = await service.getAnalytics('company-1');
    expect(result.medianDaysToFirstMove).toBeNull();
  });

  it('rounds the median-days metric to one decimal', async () => {
    // pg returns a float; the card reads better as "1.2" than
    // "1.1666666666666667". Rounding lives in the service, not the client.
    historyRepo.query.mockResolvedValueOnce([{ median_days: 1.1666666667 }]);
    const result = await service.getAnalytics('company-1');
    expect(result.medianDaysToFirstMove).toBe(1.2);
  });

  it('carries the four overview counts to the response', async () => {
    // Order of getCount calls: activePipeline, hired, rejected. jobRepo.count
    // is a separate mock and carries openPositions.
    jobRepo.count.mockResolvedValueOnce(7);
    qb.getCount
      .mockResolvedValueOnce(23)
      .mockResolvedValueOnce(4)
      .mockResolvedValueOnce(11);

    const result = await service.getAnalytics('company-1');
    expect(result.openPositions).toBe(7);
    expect(result.activePipeline).toBe(23);
    expect(result.hired30d).toBe(4);
    expect(result.rejected30d).toBe(11);
  });

  it('wraps unexpected failures as an internal RPC error', async () => {
    // A downstream failure inside Promise.all must surface as a proper
    // RpcException, not a raw driver error the gateway does not know how to
    // translate.
    applicationRepo.count.mockRejectedValueOnce(new Error('db down'));
    await expectRpc(service.getAnalytics('company-1'), 500, 'db down');
  });
});
