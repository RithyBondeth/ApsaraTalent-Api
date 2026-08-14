import 'reflect-metadata';
import { RpcException } from '@nestjs/microservices';
import { UpdateEmployeeInfoService } from './update-employee-info.service';

describe('UpdateEmployeeInfoService', () => {
  const employeeRepo = {
    findOne: jest.fn(),
    save: jest.fn(),
    query: jest.fn(),
    createQueryBuilder: jest.fn(),
  };
  const repository = {
    findOne: jest.fn(),
    // Lookup and ownership resolution are batched: one `find` per collection
    // instead of a `findOne` per submitted row.
    find: jest.fn(),
    findBy: jest.fn(),
    create: jest.fn((data) => data),
    save: jest.fn(),
    delete: jest.fn(),
    query: jest.fn(),
    createQueryBuilder: jest.fn(),
  };
  const userRepo = { save: jest.fn() };
  const logger = { error: jest.fn(), warn: jest.fn() };
  const cache = { invalidateEmployeeCache: jest.fn() };
  const embedding = { embedAsVector: jest.fn() };
  const service = new UpdateEmployeeInfoService(
    employeeRepo as any,
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
    employeeRepo.save.mockImplementation(async (value) => value);
    userRepo.save.mockImplementation(async (value) => value);
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

  it('preserves a missing employee 404', async () => {
    employeeRepo.findOne.mockResolvedValue(null);
    const error = (await service
      .updateEmployeeInfo({ employeeId: 'missing', updateEmployeeInfoDTO: {} })
      .catch((caught) => caught)) as RpcException;
    expect(error.getError()).toEqual({
      statusCode: 404,
      message: 'There is no employee with this ID.',
    });
  });

  it('updates scalar fields and normalizes a changed email', async () => {
    const employee = {
      id: 'employee-1',
      job: 'Developer',
      user: { id: 'user-1', email: 'old@example.com', isEmailVerified: true },
      skills: [],
      experiences: [],
      careerScopes: [],
      socials: [],
      educations: [],
    };
    employeeRepo.findOne
      .mockResolvedValueOnce(employee)
      .mockResolvedValueOnce(employee);

    const result = await service.updateEmployeeInfo({
      employeeId: 'employee-1',
      updateEmployeeInfoDTO: {
        firstname: 'Sok',
        email: ' NEW@EXAMPLE.COM ',
      },
    });

    expect(employee).toEqual(expect.objectContaining({ firstname: 'Sok' }));
    expect(employee.user).toEqual(
      expect.objectContaining({
        email: 'new@example.com',
        isEmailVerified: false,
      }),
    );
    expect(userRepo.save).toHaveBeenCalledWith(employee.user);
    expect(cache.invalidateEmployeeCache).toHaveBeenCalledWith('employee-1');
    expect(result.message).toBe('Employee information updated successfully');
  });

  it('re-embeds a changed job title without blocking the response', async () => {
    const employee = {
      id: 'employee-1',
      job: 'Developer',
      user: { email: 'person@example.com' },
      skills: [],
      experiences: [],
      careerScopes: [],
      socials: [],
      educations: [],
    };
    employeeRepo.findOne.mockResolvedValue(employee);
    embedding.embedAsVector.mockResolvedValue('[1,2]');
    await service.updateEmployeeInfo({
      employeeId: 'employee-1',
      updateEmployeeInfoDTO: { job: 'Engineering Manager' },
    });
    await new Promise((resolve) => setImmediate(resolve));
    expect(embedding.embedAsVector).toHaveBeenCalledWith('Engineering Manager');
    expect(employeeRepo.query).toHaveBeenCalledWith(
      expect.stringContaining('jobEmbedding'),
      ['[1,2]', 'employee-1'],
    );
  });

  it('wraps persistence failures as internal RPC errors', async () => {
    employeeRepo.findOne.mockResolvedValue({
      id: 'employee-1',
      skills: [],
      experiences: [],
      careerScopes: [],
      socials: [],
      educations: [],
    });
    employeeRepo.save.mockRejectedValue(new Error('database unavailable'));
    const error = (await service
      .updateEmployeeInfo({
        employeeId: 'employee-1',
        updateEmployeeInfoDTO: {},
      })
      .catch((caught) => caught)) as RpcException;
    expect(error.getError()).toEqual({
      statusCode: 500,
      message: 'database unavailable',
    });
  });

  it('upserts every employee collection, scopes deletes, and embeds new semantics', async () => {
    const employee = {
      id: 'employee-1',
      job: 'Developer',
      user: { id: 'user-1', email: 'person@example.com' },
      skills: [{ id: 'skill-old' }],
      experiences: [],
      careerScopes: [{ id: 'scope-old' }],
      socials: [],
      educations: [],
    };
    employeeRepo.findOne
      .mockResolvedValueOnce(employee)
      .mockResolvedValueOnce(employee);
    // One batched lookup per collection, in the order the service resolves
    // them: skills, career scopes, then the owned experience/education/social
    // rows. Names absent from a result are the ones that get created.
    repository.find
      .mockResolvedValueOnce([{ id: 'skill-existing', name: 'TypeScript' }])
      .mockResolvedValueOnce([{ id: 'scope-existing', name: 'Engineering' }])
      .mockResolvedValueOnce([{ id: 'exp-1', title: 'Junior' }])
      .mockResolvedValueOnce([{ id: 'edu-1', degree: 'Bachelor' }])
      .mockResolvedValueOnce([{ id: 'social-1', url: 'old' }]);
    repository.save.mockImplementation(async (value: any) => {
      const rows = Array.isArray(value) ? value : [value];
      const saved = rows.map((row: any) => {
        if (row.name === 'NestJS') return { ...row, id: 'skill-new' };
        if (row.name === 'Design') return { ...row, id: 'scope-new' };
        return row;
      });
      return Array.isArray(value) ? saved : saved[0];
    });

    const skillRelation = relationQueryBuilder();
    const scopeRelation = relationQueryBuilder();
    employeeRepo.createQueryBuilder
      .mockReturnValueOnce(skillRelation)
      .mockReturnValueOnce(scopeRelation);
    const deletionQbs = [
      deleteQueryBuilder(),
      deleteQueryBuilder(),
      deleteQueryBuilder(),
    ];
    repository.createQueryBuilder
      .mockReturnValueOnce(deletionQbs[0])
      .mockReturnValueOnce(deletionQbs[1])
      .mockReturnValueOnce(deletionQbs[2]);

    const result = await service.updateEmployeeInfo({
      employeeId: 'employee-1',
      updateEmployeeInfoDTO: {
        job: 'Engineering Lead',
        skills: [
          { id: 'skill-direct' },
          { name: 'TypeScript' },
          { name: 'NestJS' },
          { name: ' ' },
        ],
        skillIdsToDelete: ['skill-old'],
        careerScopes: [
          { id: 'scope-direct' },
          { name: 'Engineering' },
          { name: 'Design' },
          { name: ' ' },
        ],
        careerScopeIdsToDelete: ['scope-old'],
        experiences: [
          { id: 'exp-1', title: 'Senior' },
          { title: 'Lead', company: 'Apsara' },
        ],
        experienceIdsToDelete: ['exp-delete'],
        educations: [
          { id: 'edu-1', degree: 'Master' },
          { degree: 'Bachelor', school: 'RUPP' },
        ],
        educationIdsToDelete: ['edu-delete'],
        socials: [
          { id: 'social-1', url: 'new' },
          { platform: 'github', url: 'https://github.invalid/person' },
        ],
        socialIdsToDelete: ['social-delete'],
      } as any,
    });

    await new Promise((resolve) => setImmediate(resolve));
    expect(skillRelation.addAndRemove).toHaveBeenCalled();
    expect(scopeRelation.addAndRemove).toHaveBeenCalled();
    expect(deletionQbs.every((qb) => qb.execute.mock.calls.length === 1)).toBe(
      true,
    );
    expect(embedding.embedAsVector).toHaveBeenCalledWith('Engineering Lead');
    expect(embedding.embedAsVector).toHaveBeenCalledWith('Design');
    expect(repository.query).toHaveBeenCalledWith(
      expect.stringContaining('career_scope'),
      ['[0.1,0.2]', 'scope-new'],
    );
    expect(result.message).toBe('Employee information updated successfully');
  });

  it('handles sparse relationships, duplicate IDs, and missing owned records', async () => {
    const employee = {
      id: 'employee-1',
      job: null,
      user: { id: 'user-1', email: 'person@example.com' },
      skills: null,
      careerScopes: null,
    };
    employeeRepo.findOne
      .mockResolvedValueOnce(employee)
      .mockResolvedValueOnce(null);
    repository.findOne.mockResolvedValue(null);
    const skillRelation = relationQueryBuilder();
    const scopeRelation = relationQueryBuilder();
    employeeRepo.createQueryBuilder
      .mockReturnValueOnce(skillRelation)
      .mockReturnValueOnce(scopeRelation);

    const result = await service.updateEmployeeInfo({
      employeeId: 'employee-1',
      updateEmployeeInfoDTO: {
        email: ' ',
        skills: [{ id: 'skill-1' }, { id: 'skill-1' }],
        skillIdsToDelete: [],
        careerScopes: [{ id: 'scope-1' }, { id: 'scope-1' }],
        careerScopeIdsToDelete: [],
        experiences: [{ id: 'foreign-experience', title: 'Ignored' }],
        experienceIdsToDelete: [],
        educations: [{ id: 'foreign-education', degree: 'Ignored' }],
        educationIdsToDelete: [],
        socials: [{ id: 'foreign-social', url: 'https://invalid.test' }],
        socialIdsToDelete: [],
      } as any,
    });

    expect(skillRelation.addAndRemove).toHaveBeenCalledWith(['skill-1'], []);
    expect(scopeRelation.addAndRemove).toHaveBeenCalledWith(['scope-1'], []);
    expect(repository.save).not.toHaveBeenCalled();
    expect(repository.createQueryBuilder).not.toHaveBeenCalled();
    expect(userRepo.save).not.toHaveBeenCalled();
    expect(result.message).toBe('Employee information updated successfully');
  });

  it('contains asynchronous embedding failures for job titles and scopes', async () => {
    const employee = {
      id: 'employee-1',
      job: 'Developer',
      user: { email: 'person@example.com' },
      skills: [],
      careerScopes: [],
    };
    employeeRepo.findOne.mockResolvedValue(employee);
    repository.find.mockResolvedValue([]);
    repository.save.mockResolvedValue([{ id: 'scope-new', name: 'Design' }]);
    employeeRepo.createQueryBuilder.mockReturnValue(relationQueryBuilder());
    embedding.embedAsVector.mockRejectedValue(new Error('embedding offline'));

    await expect(
      service.updateEmployeeInfo({
        employeeId: 'employee-1',
        updateEmployeeInfoDTO: {
          job: 'Lead',
          careerScopes: [{ name: 'Design' }],
        } as any,
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        message: 'Employee information updated successfully',
      }),
    );
    await new Promise((resolve) => setImmediate(resolve));

    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Failed to embed employee job title'),
    );
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Failed to embed career scope'),
    );
  });

  it('covers explicit relation deletion and unchanged relation sets', async () => {
    const employee = {
      id: 'employee-1',
      user: { email: 'person@example.com' },
      skills: [{ id: 'skill-old' }, { id: 'skill-delete' }],
      careerScopes: [{ id: 'scope-keep' }],
    };
    employeeRepo.findOne.mockResolvedValue(employee);
    const skillRelation = relationQueryBuilder();
    employeeRepo.createQueryBuilder.mockReturnValueOnce(skillRelation);

    await service.updateEmployeeInfo({
      employeeId: 'employee-1',
      updateEmployeeInfoDTO: {
        skills: [{ id: 'skill-delete' }],
        skillIdsToDelete: ['skill-delete'],
        careerScopes: [{ id: 'scope-keep' }, null],
        careerScopeIdsToDelete: [],
      } as any,
    });

    expect(skillRelation.addAndRemove).toHaveBeenCalledWith(
      [],
      expect.arrayContaining(['skill-old', 'skill-delete']),
    );
    expect(employeeRepo.createQueryBuilder).toHaveBeenCalledTimes(1);
  });

  it('uses a stable fallback for a null update failure', async () => {
    employeeRepo.findOne.mockRejectedValueOnce(null);
    const error = (await service
      .updateEmployeeInfo({
        employeeId: 'employee-1',
        updateEmployeeInfoDTO: {},
      })
      .catch((caught) => caught)) as RpcException;

    expect(error.getError()).toEqual({
      statusCode: 500,
      message: "An error occurred while updating the employee's information.",
    });
  });
});
