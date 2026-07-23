import { RpcException } from '@nestjs/microservices';
import { hashRefreshToken } from '@app/common/jwt/refresh-token-hash.util';
import { RefreshTokenService } from './refresh-token.service';

describe('RefreshTokenService', () => {
  const user = {
    id: 'user-id',
    email: 'user@example.com',
    role: 'employee',
    refreshToken: hashRefreshToken('old-refresh'),
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
      where: { id: user.id, refreshToken: hashRefreshToken('old-refresh') },
    });
    expect(repository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        refreshToken: hashRefreshToken('new-refresh'),
      }),
    );
    expect(result.accessToken).toBe('new-access');
    expect(result.refreshToken).toBe('new-refresh');
  });

  it('never writes a refresh token to the database in plaintext', async () => {
    // The client receives the usable token; the database only ever sees its
    // digest. A dump of the user table must not yield replayable credentials.
    const { service, repository } = createService();

    const result = await service.refreshToken({ refreshToken: 'old-refresh' });
    const [persisted] = repository.save.mock.calls[0];
    const [{ where }] = repository.findOne.mock.calls[0];

    expect(result.refreshToken).toBe('new-refresh');
    expect(persisted.refreshToken).not.toBe('new-refresh');
    expect(persisted.refreshToken).toMatch(/^[0-9a-f]{64}$/);
    expect(where.refreshToken).not.toBe('old-refresh');
  });

  it('rejects a token whose digest is not the stored one', async () => {
    // Guards against the lookup being loosened back to a plaintext compare,
    // which would let any syntactically valid JWT through.
    const { service, repository } = createService(null);

    await expect(
      service.refreshToken({ refreshToken: 'someone-elses-token' }),
    ).rejects.toBeInstanceOf(RpcException);
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('reports an unknown stored token as unauthorized', async () => {
    const { service } = createService(null);

    await expect(
      service.refreshToken({ refreshToken: 'unknown-refresh' }),
    ).rejects.toBeInstanceOf(RpcException);
  });
});
