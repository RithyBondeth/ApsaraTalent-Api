import 'reflect-metadata';
import { RpcException } from '@nestjs/microservices';
import { MatchLinkService } from './match-link.service';

describe('MatchLinkService', () => {
  const matching = {
    findOne: jest.fn(),
    create: jest.fn((data) => data),
    save: jest.fn(),
  };
  const employees = { findOne: jest.fn() };
  const companies = { findOne: jest.fn() };
  const redis = { invalidateMatchingCaches: jest.fn() };
  const service = new MatchLinkService(
    matching as any,
    employees as any,
    companies as any,
    redis as any,
  );

  const employee = { id: 'employee-1', user: { id: 'employee-user' } };
  const company = {
    id: 'company-1',
    user: { id: 'company-user' },
    openPositions: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    matching.save.mockImplementation(async (value) => value);
    redis.invalidateMatchingCaches.mockResolvedValue(undefined);
    employees.findOne.mockResolvedValue(employee);
    companies.findOne.mockResolvedValue(company);
  });

  /* ------------------------------ recordInterest ----------------------------- */
  it('creates the pairing with only the acting side set', async () => {
    matching.findOne.mockResolvedValue(null);

    const result = await service.recordInterest(
      'employee-1',
      'company-1',
      'employee',
    );

    expect(matching.create).toHaveBeenCalledWith(
      expect.objectContaining({
        employeeLiked: true,
        companyLiked: false,
        isMatched: false,
      }),
    );
    expect(result.becameMatched).toBe(false);
  });

  it('promotes to a match when the second side arrives', async () => {
    matching.findOne.mockResolvedValue({
      id: 'match-1',
      employeeLiked: true,
      companyLiked: false,
      isMatched: false,
    });

    const result = await service.recordInterest(
      'employee-1',
      'company-1',
      'company',
    );

    expect(result.becameMatched).toBe(true);
    expect(result.match.isMatched).toBe(true);
  });

  it('reports becameMatched only on the transition, never on a repeat', async () => {
    // The callers send "it's a match" notifications off this flag, so a second
    // like must not announce the match again.
    matching.findOne.mockResolvedValue({
      id: 'match-1',
      employeeLiked: true,
      companyLiked: true,
      isMatched: true,
    });

    const result = await service.recordInterest(
      'employee-1',
      'company-1',
      'company',
    );

    expect(result.becameMatched).toBe(false);
  });

  it('rejects a pairing where either profile is missing', async () => {
    employees.findOne.mockResolvedValue(null);
    const error = (await service
      .recordInterest('employee-1', 'company-1', 'employee')
      .catch((caught) => caught)) as RpcException;
    expect(error).toBeInstanceOf(RpcException);
    expect(error.getError()).toEqual({
      statusCode: 404,
      message: 'Employee or Company not found.',
    });
  });

  it('invalidates the matching caches both sides read', async () => {
    matching.findOne.mockResolvedValue(null);
    await service.recordInterest('employee-1', 'company-1', 'employee');
    expect(redis.invalidateMatchingCaches).toHaveBeenCalledWith(
      'employee-1',
      'company-1',
    );
  });

  /* ------------------------------ areUsersMatched ---------------------------- */
  it('confirms a match between the two auth users behind the profiles', async () => {
    matching.findOne.mockResolvedValue({ id: 'match-1' });
    await expect(
      service.areUsersMatched('employee-user', 'company-user'),
    ).resolves.toBe(true);
  });

  it('denies when the pair exists but is not matched', async () => {
    matching.findOne.mockResolvedValue(null);
    await expect(
      service.areUsersMatched('employee-user', 'company-user'),
    ).resolves.toBe(false);
  });

  it('denies a user talking to themselves', async () => {
    await expect(
      service.areUsersMatched('employee-user', 'employee-user'),
    ).resolves.toBe(false);
    expect(matching.findOne).not.toHaveBeenCalled();
  });

  it('denies when one side has no profile', async () => {
    companies.findOne.mockResolvedValue(null);
    await expect(
      service.areUsersMatched('employee-user', 'stranger'),
    ).resolves.toBe(false);
  });

  it('denies when the two ids do not resolve to the two sides of one pair', async () => {
    /*
      Both lookups use an OR over the two ids, so a third party's id could
      otherwise pair one person's employee profile with someone else's company
      and read as matched.
    */
    await expect(
      service.areUsersMatched('employee-user', 'unrelated-user'),
    ).resolves.toBe(false);
    expect(matching.findOne).not.toHaveBeenCalled();
  });
});
