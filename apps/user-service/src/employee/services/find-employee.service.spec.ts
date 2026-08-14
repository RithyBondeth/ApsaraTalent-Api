import 'reflect-metadata';
import { RpcException } from '@nestjs/microservices';
import { FindEmployeeService } from './find-employee.service';
import { generateListKey } from '@app/common/redis/redis-keys.util';

describe('FindEmployeeService', () => {
  const employees = { find: jest.fn(), count: jest.fn() };
  const users = { findOne: jest.fn() };
  // getBlockedCounterpartUserIds reads the FK columns through a query builder
  // rather than hydrating blocker/blocked. The previous mock resolved `find()`
  // to rows with those relations populated — a shape TypeORM never actually
  // returns without `relations`, which is why this suite stayed green while the
  // filter silently matched nobody in production.
  const blockRows = jest.fn();
  const blocks = {
    exists: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getRawMany: blockRows,
    })),
  };
  const logger = { info: jest.fn(), error: jest.fn() };
  const redis = {
    get: jest.fn(),
    set: jest.fn(),
  };
  const service = new FindEmployeeService(
    employees as any,
    users as any,
    blocks as any,
    logger as any,
    redis as any,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    redis.get.mockResolvedValue(null);
    blockRows.mockResolvedValue([]);
  });

  it('returns an unfiltered employee list from cache', async () => {
    const cached = [{ id: 'employee-1' }];
    redis.get.mockResolvedValue(cached);
    await expect(service.findAll({})).resolves.toBe(cached);
    expect(employees.find).not.toHaveBeenCalled();
  });

  it('caches blocked-filtered results under a key of their own', async () => {
    blockRows.mockResolvedValue([
      { blockerId: 'requester', blockedId: 'blocked-user' },
    ]);
    employees.find
      .mockResolvedValueOnce([{ id: 'blocked-employee' }])
      .mockResolvedValueOnce([{ id: 'visible', firstname: 'Visible' }]);
    const result = await service.findAll({ requesterId: 'requester' });
    expect(result).toHaveLength(1);

    // Filtered pages used to skip the cache entirely, so anyone who had
    // blocked someone paid the full uncached query on every load. They are
    // cached now, but never under the shared key — that would hide the blocked
    // employee from everyone.
    const [readKey] = redis.get.mock.calls[0];
    const [writeKey] = redis.set.mock.calls[0];
    expect(readKey).toBe(writeKey);
    expect(readKey).toContain('exclude');
    expect(readKey).not.toBe(
      generateListKey('employee', { skip: 0, limit: 10 }),
    );
  });

  it('leaves the unfiltered key untouched when nothing is excluded', async () => {
    // Users with no blocks must keep hitting the shared entry, byte-identical
    // to the key that is already live in Redis.
    employees.find.mockResolvedValueOnce([{ id: 'visible' }]);
    await service.findAll({ requesterId: 'requester', skip: 0, limit: 10 });

    const [readKey] = redis.get.mock.calls[0];
    expect(readKey).toBe(generateListKey('employee', { skip: 0, limit: 10 }));
    expect(readKey).not.toContain('exclude');
  });

  it('hides a blocked profile with a 404 response', async () => {
    users.findOne.mockResolvedValue({ id: 'target-user' });
    blocks.exists.mockResolvedValue(true);
    const error = (await service
      .findOneById({ employeeId: 'employee-1', requesterId: 'requester' })
      .catch((caught) => caught)) as RpcException;
    expect(error.getError()).toEqual({
      statusCode: 404,
      message: 'This profile is not available.',
    });
    expect(redis.get).not.toHaveBeenCalled();
  });

  it('loads, maps, and caches an available employee detail', async () => {
    users.findOne.mockResolvedValue({
      id: 'user-1',
      email: 'person@example.com',
      employee: { id: 'employee-1', firstname: 'Sok' },
    });
    const result = await service.findOneById({ employeeId: 'employee-1' });
    expect(result).toEqual(
      expect.objectContaining({
        id: 'employee-1',
        email: 'person@example.com',
      }),
    );
    expect(redis.set).toHaveBeenCalled();
  });

  it('counts only visible employees and caches the result', async () => {
    employees.count.mockResolvedValue(12);
    const result = await service.countAllEmployees();
    expect(employees.count).toHaveBeenCalledWith({ where: { isHide: false } });
    expect(result.totalEmployees).toBe(12);
    expect(redis.set).toHaveBeenCalled();
  });

  it('wraps repository failures as internal RPC errors', async () => {
    employees.count.mockRejectedValue(new Error('database unavailable'));
    const error = (await service
      .countAllEmployees()
      .catch((caught) => caught)) as RpcException;
    expect(error.getError()).toEqual({
      statusCode: 500,
      message: 'database unavailable',
    });
  });

  it('wraps null and failed employee list queries', async () => {
    employees.find.mockResolvedValueOnce(null);
    const empty = (await service
      .findAll({})
      .catch((error) => error)) as RpcException;
    expect(empty.getError()).toEqual({
      statusCode: 500,
      message: 'There are no employees available',
    });
    employees.find.mockRejectedValueOnce(new Error('list failed'));
    const failed = (await service
      .findAll({})
      .catch((error) => error)) as RpcException;
    expect(failed.getError()).toEqual({
      statusCode: 500,
      message: 'list failed',
    });
  });

  it('returns cached counts and details', async () => {
    redis.get.mockResolvedValueOnce({ totalEmployees: 3 });
    await expect(service.countAllEmployees()).resolves.toEqual({
      totalEmployees: 3,
    });
    redis.get.mockResolvedValueOnce({ id: 'employee-1' });
    await expect(
      service.findOneById({ employeeId: 'employee-1' }),
    ).resolves.toEqual({
      id: 'employee-1',
    });
  });

  it('hides a missing target owner and skips block checks for the owner', async () => {
    users.findOne.mockResolvedValueOnce(null);
    await expect(
      service.findOneById({
        employeeId: 'employee-1',
        requesterId: 'requester',
      }),
    ).rejects.toBeInstanceOf(RpcException);
    users.findOne
      .mockResolvedValueOnce({ id: 'requester' })
      .mockResolvedValueOnce({
        email: 'owner@example.com',
        employee: { id: 'employee-1' },
      });
    await service.findOneById({
      employeeId: 'employee-1',
      requesterId: 'requester',
    });
    expect(blocks.exists).not.toHaveBeenCalled();
  });

  it('wraps employee-detail database failures', async () => {
    users.findOne.mockRejectedValueOnce(new Error('detail failed'));
    const error = (await service
      .findOneById({ employeeId: 'employee-1' })
      .catch((caught) => caught)) as RpcException;
    expect(error.getError()).toEqual({
      statusCode: 500,
      message: 'detail failed',
    });
  });

  it('loads and caches an unfiltered database page', async () => {
    employees.find.mockResolvedValue([{ id: 'employee-1', firstname: 'Sok' }]);

    await expect(service.findAll({ skip: 5, limit: 2 })).resolves.toEqual([
      expect.objectContaining({ id: 'employee-1' }),
    ]);
    expect(redis.set).toHaveBeenCalledWith(
      generateListKey('employee', { skip: 5, limit: 2 }),
      expect.any(Array),
      expect.any(Number),
    );
  });

  it('collects a blocker from the reverse side of a block relation', async () => {
    blockRows.mockResolvedValue([
      { blockerId: 'other-user', blockedId: 'requester' },
    ]);
    employees.find
      .mockResolvedValueOnce([{ id: 'blocked-employee' }])
      .mockResolvedValueOnce([]);

    await service.findAll({ requesterId: 'requester' });

    expect(employees.find).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: expect.objectContaining({ user: expect.any(Object) }),
      }),
    );
    // A block found from the reverse side still isolates the cache entry.
    expect(redis.get.mock.calls[0][0]).toContain('exclude');
  });

  it('preserves a missing employee detail as a 404 without a requester', async () => {
    users.findOne.mockResolvedValue(null);
    const error = (await service
      .findOneById({ employeeId: 'missing' })
      .catch((caught) => caught)) as RpcException;

    expect(error.getError()).toEqual({
      statusCode: 404,
      message: 'There is no employee with this id',
    });
  });

  it('uses stable fallback messages for malformed repository failures', async () => {
    employees.find.mockRejectedValueOnce(null);
    const list = (await service
      .findAll({})
      .catch((error) => error)) as RpcException;
    expect(list.getError()).toEqual({
      statusCode: 500,
      message: 'An error occurred while fetching all of the employees',
    });

    users.findOne.mockRejectedValueOnce(null);
    const detail = (await service
      .findOneById({ employeeId: 'employee-1' })
      .catch((error) => error)) as RpcException;
    expect(detail.getError()).toEqual({
      statusCode: 500,
      message: 'An error occurred while fetching an employee',
    });

    employees.count.mockRejectedValueOnce(null);
    const count = (await service
      .countAllEmployees()
      .catch((error) => error)) as RpcException;
    expect(count.getError()).toEqual({
      statusCode: 500,
      message: 'An error occurred while counting all employees',
    });
  });
});
