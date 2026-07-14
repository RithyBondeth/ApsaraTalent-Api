import { ImageService } from './image.service';
import { PinoLogger } from 'nestjs-pino';

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
});
