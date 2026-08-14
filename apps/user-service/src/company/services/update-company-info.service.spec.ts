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
    // Lookup and ownership resolution are batched: one `find` per collection
    // instead of a `findOne` per submitted row.
    find: jest.fn(),
    create: jest.fn((data) => data),
    save: jest.fn(),
    delete: jest.fn(),
    query: jest.fn(),
    createQueryBuilder: jest.fn(),
  };
  const userRepo = { save: jest.fn(), find: jest.fn() };
  const logger = { error: jest.fn(), warn: jest.fn() };
  const cache = {
    invalidateCompanyCache: jest.fn(),
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
    cache as any,
    embedding as any,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    companyRepo.save.mockImplementation(async (value) => value);
    userRepo.save.mockImplementation(async (value) => value);
    userRepo.find.mockResolvedValue([{ id: 'user-1' }]);
    repository.create.mockImplementation((data) => data);
    repository.find.mockResolvedValue([]);
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
    expect(cache.invalidateCompanyCache).toHaveBeenCalledWith('company-1');
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

    // One batched lookup per collection, in the order the service resolves
    // them: benefits, values, owned jobs, career scopes, owned socials. Labels
    // and names absent from a result are the ones that get created.
    repository.find
      .mockResolvedValueOnce([{ id: 2, label: 'Health' }])
      .mockResolvedValueOnce([{ id: 11, label: 'Integrity' }])
      .mockResolvedValueOnce([{ id: 'job-1', title: 'Developer' }])
      .mockResolvedValueOnce([{ id: 'scope-existing', name: 'Engineering' }])
      .mockResolvedValueOnce([{ id: 'social-1', url: 'old' }]);
    repository.save.mockImplementation(async (value: any) => {
      const rows = Array.isArray(value) ? value : [value];
      const saved = rows.map((row: any) => {
        if (row.label === 'Remote') return { ...row, id: 3 };
        if (row.label === 'Growth') return { ...row, id: 12 };
        if (row.name === 'Design') return { ...row, id: 'scope-new' };
        if (row.title === 'Designer') return { ...row, id: 'job-new' };
        return row;
      });
      return Array.isArray(value) ? saved : saved[0];
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

  it('contains asynchronous embedding failures without failing the profile update', async () => {
    const company = {
      id: 'company-1',
      user: { id: 'user-1', email: 'company@example.com' },
      benefits: [],
      values: [],
      openPositions: [],
      careerScopes: [],
      socials: [],
    };
    companyRepo.findOne.mockResolvedValue(company);
    companyRepo.createQueryBuilder.mockReturnValue(relationQueryBuilder());
    repository.find.mockResolvedValue([]);
    repository.save.mockImplementation(async (value: any) => {
      const rows = Array.isArray(value) ? value : [value];
      const saved = rows.map((row: any) => ({
        id: row.title ? 'job-new' : 'scope-new',
        ...row,
      }));
      return Array.isArray(value) ? saved : saved[0];
    });
    embedding.embedAsVector.mockRejectedValue(new Error('embedding offline'));

    await expect(
      service.updateCompanyInfo({
        companyId: 'company-1',
        updateCompanyInfoDTO: {
          jobs: [{ title: 'Engineer' }],
          careerScopes: [{ name: 'Engineering' }],
        } as any,
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        message: 'Company information updated successfully',
      }),
    );
    await new Promise((resolve) => setImmediate(resolve));
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('embedding offline'),
    );
  });

  it('wraps cache invalidation and non-Error repository failures', async () => {
    companyRepo.findOne.mockResolvedValueOnce({
      id: 'company-1',
      benefits: [],
      values: [],
      openPositions: [],
      careerScopes: [],
      socials: [],
    });
    cache.invalidateCompanyCache.mockRejectedValueOnce(
      new Error('cache unavailable'),
    );
    const cacheFailure = (await service
      .updateCompanyInfo({
        companyId: 'company-1',
        updateCompanyInfoDTO: {},
      })
      .catch((error) => error)) as RpcException;
    expect(cacheFailure.getError()).toEqual({
      statusCode: 500,
      message: 'cache unavailable',
    });

    companyRepo.findOne.mockRejectedValueOnce(null);
    const repositoryFailure = (await service
      .updateCompanyInfo({
        companyId: 'company-1',
        updateCompanyInfoDTO: {},
      })
      .catch((error) => error)) as RpcException;
    expect(repositoryFailure.getError()).toEqual({
      statusCode: 500,
      message: "An error occurred while updating the company's information.",
    });
  });

  it('handles sparse collections, duplicate relation IDs, and missing owned rows', async () => {
    const company = {
      id: 'company-1',
      user: { email: 'company@example.com' },
      benefits: null,
      values: null,
      openPositions: null,
      careerScopes: null,
      socials: null,
    };
    companyRepo.findOne
      .mockResolvedValueOnce(company)
      .mockResolvedValueOnce(null);
    repository.findOne.mockResolvedValue(null);
    const relations = [
      relationQueryBuilder(),
      relationQueryBuilder(),
      relationQueryBuilder(),
    ];
    companyRepo.createQueryBuilder
      .mockReturnValueOnce(relations[0])
      .mockReturnValueOnce(relations[1])
      .mockReturnValueOnce(relations[2]);

    const result = await service.updateCompanyInfo({
      companyId: 'company-1',
      updateCompanyInfoDTO: {
        email: ' ',
        benefits: [{ id: 1 }, { id: 1 }],
        benefitIdsToDelete: [],
        values: [{ id: 2 }, { id: 2 }, { label: ' ' }],
        valueIdsToDelete: [],
        jobs: [{ id: 'foreign-job', title: 'Ignored' }],
        jobIdsToDelete: [],
        careerScopes: [{ id: 'scope-1' }, { id: 'scope-1' }],
        careerScopeIdsToDelete: [],
        socials: [{ id: 'foreign-social', url: 'https://invalid.test' }],
        socialIdsToDelete: [],
      } as any,
    });

    expect(relations[0].addAndRemove).toHaveBeenCalledWith([1], []);
    expect(relations[1].addAndRemove).toHaveBeenCalledWith([2], []);
    expect(relations[2].addAndRemove).toHaveBeenCalledWith(['scope-1'], []);
    expect(repository.save).not.toHaveBeenCalled();
    expect(repository.createQueryBuilder).not.toHaveBeenCalled();
    expect(userRepo.save).not.toHaveBeenCalled();
    expect(result.message).toBe('Company information updated successfully');
  });
});
