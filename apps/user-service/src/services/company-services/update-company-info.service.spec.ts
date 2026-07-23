import 'reflect-metadata';
import { RpcException } from '@nestjs/microservices';
import { UpdateCompanyInfoService } from './update-company-info.service';

describe('UpdateCompanyInfoService', () => {
  const companyRepo = {
    findOne: jest.fn(),
    save: jest.fn(),
    createQueryBuilder: jest.fn(),
  };
  const repository = {
    findOne: jest.fn(),
    create: jest.fn((data) => data),
    save: jest.fn(),
    delete: jest.fn(),
    query: jest.fn(),
    createQueryBuilder: jest.fn(),
  };
  const userRepo = { save: jest.fn(), find: jest.fn() };
  const logger = { error: jest.fn(), warn: jest.fn() };
  const redis = {
    generateUserKey: jest.fn((_type, id) => `user:${id}`),
    generateListKey: jest.fn(() => 'user-list'),
    del: jest.fn(),
    invalidateJobSearchCaches: jest.fn(),
  };
  const embedding = { embedAsVector: jest.fn() };
  const service = new UpdateCompanyInfoService(
    companyRepo as any,
    repository as any,
    repository as any,
    repository as any,
    repository as any,
    repository as any,
    userRepo as any,
    logger as any,
    redis as any,
    embedding as any,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    companyRepo.save.mockImplementation(async (value) => value);
    userRepo.save.mockImplementation(async (value) => value);
    userRepo.find.mockResolvedValue([{ id: 'user-1' }]);
    repository.create.mockImplementation((data) => data);
    repository.save.mockImplementation(async (value) => value);
    embedding.embedAsVector.mockResolvedValue('[0.1,0.2]');
  });

  function relationQueryBuilder() {
    const qb: any = {};
    for (const method of ['relation', 'of']) qb[method] = jest.fn(() => qb);
    qb.addAndRemove = jest.fn().mockResolvedValue(undefined);
    return qb;
  }

  function deleteQueryBuilder() {
    const qb: any = {};
    for (const method of ['delete', 'from', 'where', 'andWhere']) {
      qb[method] = jest.fn(() => qb);
    }
    qb.execute = jest.fn().mockResolvedValue({ affected: 1 });
    return qb;
  }

  it('preserves a missing company 404', async () => {
    companyRepo.findOne.mockResolvedValue(null);
    const error = (await service
      .updateCompanyInfo({
        companyId: 'missing',
        updateCompanyInfoDTO: {},
      })
      .catch((caught) => caught)) as RpcException;
    expect(error.getError()).toEqual({
      statusCode: 404,
      message: 'There is no company with this ID.',
    });
  });

  it('updates scalar fields and normalizes a changed email', async () => {
    const company = {
      id: 'company-1',
      user: { email: 'old@example.com', isEmailVerified: true },
      benefits: [],
      values: [],
      openPositions: [],
      careerScopes: [],
      socials: [],
    };
    companyRepo.findOne.mockResolvedValue(company);
    const result = await service.updateCompanyInfo({
      companyId: 'company-1',
      updateCompanyInfoDTO: {
        name: 'Apsara Talent',
        email: ' NEW@EXAMPLE.COM ',
      },
    });
    expect(company).toEqual(expect.objectContaining({ name: 'Apsara Talent' }));
    expect(company.user).toEqual(
      expect.objectContaining({
        email: 'new@example.com',
        isEmailVerified: false,
      }),
    );
    expect(redis.del).toHaveBeenCalledWith('user:user-1');
    expect(redis.invalidateJobSearchCaches).toHaveBeenCalled();
    expect(result.message).toBe('Company information updated successfully');
  });

  it('does not re-save an unchanged email', async () => {
    const company = {
      id: 'company-1',
      user: { email: 'same@example.com', isEmailVerified: true },
      benefits: [],
      values: [],
      openPositions: [],
      careerScopes: [],
      socials: [],
    };
    companyRepo.findOne.mockResolvedValue(company);
    await service.updateCompanyInfo({
      companyId: 'company-1',
      updateCompanyInfoDTO: { email: 'same@example.com' },
    });
    expect(userRepo.save).not.toHaveBeenCalled();
  });

  it('wraps persistence failures as internal RPC errors', async () => {
    companyRepo.findOne.mockResolvedValue({
      id: 'company-1',
      benefits: [],
      values: [],
      openPositions: [],
      careerScopes: [],
      socials: [],
    });
    companyRepo.save.mockRejectedValue(new Error('database unavailable'));
    const error = (await service
      .updateCompanyInfo({
        companyId: 'company-1',
        updateCompanyInfoDTO: {},
      })
      .catch((caught) => caught)) as RpcException;
    expect(error.getError()).toEqual({
      statusCode: 500,
      message: 'database unavailable',
    });
  });

  it('updates every company collection, scopes deletes, and starts embeddings', async () => {
    const company = {
      id: 'company-1',
      user: { id: 'user-1', email: 'company@example.com' },
      benefits: [{ id: 1 }],
      values: [{ id: 10 }],
      openPositions: [],
      careerScopes: [{ id: 'scope-old' }],
      socials: [],
    };
    const freshCompany = {
      ...company,
      openPositions: [{ id: 'job-new', title: 'Designer' }],
    };
    companyRepo.findOne
      .mockResolvedValueOnce(company)
      .mockResolvedValueOnce(freshCompany);

    repository.findOne
      .mockResolvedValueOnce({ id: 2, label: 'Health' })
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 11, label: 'Integrity' })
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 'job-1', title: 'Developer' })
      .mockResolvedValueOnce({ id: 'scope-existing', name: 'Engineering' })
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 'social-1', url: 'old' });
    repository.save.mockImplementation(async (value: any) => {
      if (value.label === 'Remote') return { ...value, id: 3 };
      if (value.label === 'Growth') return { ...value, id: 12 };
      if (value.name === 'Design') return { ...value, id: 'scope-new' };
      if (value.title === 'Designer') return { ...value, id: 'job-new' };
      return value;
    });

    const relationQbs = [
      relationQueryBuilder(),
      relationQueryBuilder(),
      relationQueryBuilder(),
    ];
    companyRepo.createQueryBuilder
      .mockReturnValueOnce(relationQbs[0])
      .mockReturnValueOnce(relationQbs[1])
      .mockReturnValueOnce(relationQbs[2]);
    const jobDelete = deleteQueryBuilder();
    const socialDelete = deleteQueryBuilder();
    repository.createQueryBuilder
      .mockReturnValueOnce(jobDelete)
      .mockReturnValueOnce(socialDelete);

    const result = await service.updateCompanyInfo({
      companyId: 'company-1',
      updateCompanyInfoDTO: {
        benefits: [
          { id: 2 },
          { label: 'Health' },
          { label: 'Remote' },
          { label: ' ' },
        ],
        benefitIdsToDelete: [1],
        values: [{ id: 11 }, { label: 'Integrity' }, { label: 'Growth' }],
        valueIdsToDelete: [10],
        jobs: [
          { id: 'job-1', title: 'Senior Developer' },
          { title: 'Designer' },
        ],
        jobIdsToDelete: ['job-delete'],
        careerScopes: [
          { id: 'scope-direct' },
          { name: 'Engineering' },
          { name: 'Design' },
        ],
        careerScopeIdsToDelete: ['scope-old'],
        socials: [
          { id: 'social-1', url: 'new' },
          { platform: 'linkedin', url: 'https://linkedin.invalid/company' },
        ],
        socialIdsToDelete: ['social-delete'],
      } as any,
    });

    await new Promise((resolve) => setImmediate(resolve));
    expect(
      relationQbs.every((qb) => qb.addAndRemove.mock.calls.length === 1),
    ).toBe(true);
    expect(jobDelete.execute).toHaveBeenCalled();
    expect(socialDelete.execute).toHaveBeenCalled();
    expect(embedding.embedAsVector).toHaveBeenCalledWith('Senior Developer');
    expect(embedding.embedAsVector).toHaveBeenCalledWith('Designer');
    expect(embedding.embedAsVector).toHaveBeenCalledWith('Design');
    expect(repository.query).toHaveBeenCalledTimes(3);
    expect(result.company.openPositions).toHaveLength(1);
  });
});
