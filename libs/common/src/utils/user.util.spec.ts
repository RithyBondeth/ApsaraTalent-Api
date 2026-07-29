import { resolveUserId, resolveUserIdSafe } from './user.util';

describe('user identity utilities', () => {
  it('resolves raw user, employee, and company identifiers in order', async () => {
    const repository = { findOne: jest.fn() };
    repository.findOne.mockResolvedValueOnce({ id: 'user-1' });
    await expect(resolveUserId(repository as any, 'input')).resolves.toBe(
      'user-1',
    );
    expect(repository.findOne).toHaveBeenCalledTimes(1);

    repository.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 'employee-user' });
    await expect(resolveUserId(repository as any, 'employee-id')).resolves.toBe(
      'employee-user',
    );
    expect(repository.findOne).toHaveBeenLastCalledWith({
      where: { employee: { id: 'employee-id' } },
      relations: ['employee'],
    });

    repository.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 'company-user' });
    await expect(resolveUserId(repository as any, 'company-id')).resolves.toBe(
      'company-user',
    );
    expect(repository.findOne).toHaveBeenLastCalledWith({
      where: { company: { id: 'company-id' } },
      relations: ['company'],
    });
  });

  it('throws for an unknown id and offers a safe null-returning variant', async () => {
    const repository = { findOne: jest.fn().mockResolvedValue(null) };
    await expect(resolveUserId(repository as any, 'missing')).rejects.toThrow(
      'Could not resolve user ID from: missing',
    );
    await expect(
      resolveUserIdSafe(repository as any, 'missing'),
    ).resolves.toBeNull();
  });
});
