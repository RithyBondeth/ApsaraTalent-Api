import 'reflect-metadata';
import { RpcException } from '@nestjs/microservices';
import { FindEmployeeService } from './find-employee.service';

describe('FindEmployeeService', () => {
  const employees = { find: jest.fn(), count: jest.fn() };
  const users = { findOne: jest.fn() };
  const blocks = { find: jest.fn(), exists: jest.fn() };
  const logger = { info: jest.fn(), error: jest.fn() };
  const redis = {
    generateListKey: jest.fn(() => 'employees'),
    generateEmployeeKey: jest.fn((_type, id) => `employee:${id}`),
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
    blocks.find.mockResolvedValue([]);
  });

  it('returns an unfiltered employee list from cache', async () => {
    const cached = [{ id: 'employee-1' }];
    redis.get.mockResolvedValue(cached);
    await expect(service.findAll({})).resolves.toBe(cached);
    expect(employees.find).not.toHaveBeenCalled();
  });

  it('excludes blocks in either direction and bypasses shared cache', async () => {
    blocks.find.mockResolvedValue([
      { blocker: { id: 'requester' }, blocked: { id: 'blocked-user' } },
    ]);
    employees.find
      .mockResolvedValueOnce([{ id: 'blocked-employee' }])
      .mockResolvedValueOnce([{ id: 'visible', firstname: 'Visible' }]);
    const result = await service.findAll({ requesterId: 'requester' });
    expect(result).toHaveLength(1);
    expect(redis.get).not.toHaveBeenCalled();
    expect(redis.set).not.toHaveBeenCalled();
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
});
