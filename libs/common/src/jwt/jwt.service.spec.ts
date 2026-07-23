import { ConfigService } from '@nestjs/config';
import { JwtService as NestJwtService } from '@nestjs/jwt';
import { JwtService } from './jwt.service';

describe('JwtService token boundaries', () => {
  const nestJwtService = {
    signAsync: jest.fn(),
    verifyAsync: jest.fn(),
  } as unknown as jest.Mocked<NestJwtService>;
  const service = new JwtService(nestJwtService, new ConfigService());

  beforeEach(() => jest.clearAllMocks());

  it('marks newly generated authentication tokens as access tokens', async () => {
    nestJwtService.signAsync.mockResolvedValue('signed-token');

    await service.generateToken({
      id: 'user-1',
      info: 'user@example.com',
      role: 'employee',
    });

    expect(nestJwtService.signAsync).toHaveBeenCalledWith({
      id: 'user-1',
      info: 'user@example.com',
      role: 'employee',
      type: 'access',
    });
  });

  it('rejects a refresh token at the access-token verification boundary', async () => {
    nestJwtService.verifyAsync.mockResolvedValue({
      id: 'user-1',
      type: 'refresh',
    });

    await expect(service.verifyToken('refresh-token')).rejects.toThrow(
      'Invalid token type',
    );
  });

  it('accepts a correctly typed access token', async () => {
    const payload = { id: 'user-1', type: 'access' };
    nestJwtService.verifyAsync.mockResolvedValue(payload);

    await expect(service.verifyToken('access-token')).resolves.toEqual(payload);
  });
});
