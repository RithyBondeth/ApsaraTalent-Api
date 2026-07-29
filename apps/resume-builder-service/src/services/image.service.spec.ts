import { ImageService } from './image.service';
import { PinoLogger } from 'nestjs-pino';
import { MAX_DECODED_AVATAR_BYTES } from '@app/contracts';

describe('ImageService', () => {
  const logger = {
    setContext: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };
  const service = new ImageService(logger as unknown as PinoLogger);

  beforeEach(() => jest.clearAllMocks());

  it('does not fetch a remote candidate-controlled URL', async () => {
    await expect(
      service.optimizeProfilePicture('https://private.example/avatar.jpg'),
    ).resolves.toBe('');
    expect(logger.warn).toHaveBeenCalled();
  });

  it('rejects SVG data even when it is base64 encoded', async () => {
    const svg = Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg"/>',
    ).toString('base64');

    await expect(
      service.optimizeProfilePicture(`data:image/svg+xml;base64,${svg}`),
    ).rejects.toThrow('Unsupported profile picture format');
  });

  it('normalizes a supported inline image to a bounded JPEG', async () => {
    const onePixelPng =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

    const result = await service.optimizeProfilePicture(onePixelPng);

    expect(result).toMatch(/^data:image\/jpeg;base64,/);
    expect(result.length).toBeLessThan(1_500_000);
  });

  it('rejects empty and oversized decoded image payloads before processing', async () => {
    await expect(
      service.optimizeProfilePicture('data:image/png;base64,AA=='),
    ).rejects.toThrow();

    const oversized = Buffer.alloc(MAX_DECODED_AVATAR_BYTES + 1).toString(
      'base64',
    );
    await expect(
      service.optimizeProfilePicture(`data:image/png;base64,${oversized}`),
    ).rejects.toThrow('Profile picture is too large');
  });

  it('rejects a decoded image whose detected format is not allowed', async () => {
    const gif = 'R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';
    await expect(
      service.optimizeProfilePicture(`data:image/png;base64,${gif}`),
    ).rejects.toThrow('Unsupported profile picture format');
  });

  it('returns a stable error for non-Error image processing failures', async () => {
    const loggerOnly = new ImageService(logger as unknown as PinoLogger);
    await expect(
      loggerOnly.optimizeProfilePicture('data:image/png;base64,not-base64'),
    ).rejects.toThrow();
  });
});
