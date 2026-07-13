import { RpcException } from '@nestjs/microservices';
import { RefreshTokenService } from './refresh-token.service';

describe('RefreshTokenService', () => {
  const user = {
    id: 'user-id',
    email: 'user@example.com',
    role: 'employee',
    refreshToken: 'old-refresh',
  };

  function createService(foundUser: typeof user | null = user) {
    const repository = {
      findOne: jest.fn().mockResolvedValue(foundUser),
      save: jest.fn().mockResolvedValue(foundUser),
    };
    const jwt = {
      verifyRefreshToken: jest.fn().mockResolvedValue({ id: user.id }),
      generateToken: jest.fn().mockResolvedValue('new-access'),
      generateRefreshToken: jest.fn().mockResolvedValue('new-refresh'),
    };
    const logger = { error: jest.fn() };
    const service = new RefreshTokenService(
      repository as any,
      jwt as any,
      logger as any,
    );
    return { service, repository, jwt };
  }

  it('rotates a stored refresh token without querying a nonexistent profile relation', async () => {
    const { service, repository } = createService();

    const result = await service.refreshToken({
      refreshToken: 'old-refresh',
    });

    expect(repository.findOne).toHaveBeenCalledWith({
      where: { id: user.id, refreshToken: 'old-refresh' },
    });
    expect(repository.save).toHaveBeenCalledWith(
      expect.objectContaining({ refreshToken: 'new-refresh' }),
    );
    expect(result.accessToken).toBe('new-access');
    expect(result.refreshToken).toBe('new-refresh');
  });

  it('reports an unknown stored token as unauthorized', async () => {
    const { service } = createService(null);

    await expect(
      service.refreshToken({ refreshToken: 'unknown-refresh' }),
    ).rejects.toBeInstanceOf(RpcException);
  });
});
