import { ConfigService } from '@nestjs/config';
import { JwtService as NestJwtService } from '@nestjs/jwt';
import { JwtService } from './jwt.service';

describe('JwtService token boundaries', () => {
  const nestJwtService = {
    signAsync: jest.fn(),
    verifyAsync: jest.fn(),
    decode: jest.fn(),
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

  it('generates refresh and email tokens with configured lifetimes', async () => {
    const config = {
      get: jest.fn((key) => (key === 'jwt.refreshExpiresIn' ? '30d' : '15m')),
    };
    const configured = new JwtService(nestJwtService, config as any);
    nestJwtService.signAsync.mockResolvedValue('signed-token');
    await expect(configured.generateRefreshToken('user-1')).resolves.toBe(
      'signed-token',
    );
    expect(nestJwtService.signAsync).toHaveBeenCalledWith(
      { id: 'user-1', type: 'refresh' },
      { expiresIn: '30d' },
    );
  });

  it('accepts only correctly typed refresh tokens', async () => {
    nestJwtService.verifyAsync
      .mockResolvedValueOnce({ id: 'user-1', type: 'refresh' })
      .mockResolvedValueOnce({ type: 'access' });
    await expect(service.verifyRefreshToken('refresh')).resolves.toEqual(
      expect.objectContaining({ type: 'refresh' }),
    );
    await expect(service.verifyRefreshToken('access')).rejects.toThrow(
      'Invalid token type',
    );
  });

  it('decodes payloads and rejects undecodable tokens', () => {
    nestJwtService.decode.mockReturnValueOnce({
      id: 'user-1',
      role: 'employee',
    } as any);
    expect(service.decodeToken('token')).toEqual({
      id: 'user-1',
      role: 'employee',
    });
    nestJwtService.decode.mockReturnValueOnce(null);
    expect(() => service.decodeToken('bad')).toThrow('Failed to decode token');
  });
});
