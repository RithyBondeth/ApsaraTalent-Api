import 'reflect-metadata';
import { NotFoundException } from '@nestjs/common';
import { isPublicStorageFolder, serveStorageObject } from '@app/common';
import { PublicStorageController } from './public-storage.controller';

jest.mock('@app/common', () => ({
  ...jest.requireActual('@app/common'),
  isPublicStorageFolder: jest.fn(),
  serveStorageObject: jest.fn(),
}));

describe('PublicStorageController', () => {
  const storage = {};
  const controller = new PublicStorageController(storage as any);

  beforeEach(() => jest.clearAllMocks());

  it('serves a validated public object with cache headers', async () => {
    (isPublicStorageFolder as unknown as jest.Mock).mockReturnValue(true);
    const res = {} as any;
    await controller.getPublicFile(
      'company-images',
      ['company-1', 'image.png'],
      res,
    );
    expect(serveStorageObject).toHaveBeenCalledWith(
      res,
      storage,
      'company-images/company-1/image.png',
      { cacheControl: 'public, max-age=3600' },
    );
  });

  it('accepts the single string wildcard form', async () => {
    (isPublicStorageFolder as unknown as jest.Mock).mockReturnValue(true);
    await controller.getPublicFile('avatars', 'person.png', {} as any);
    expect(serveStorageObject).toHaveBeenCalledWith(
      expect.anything(),
      storage,
      'avatars/person.png',
      expect.anything(),
    );
  });

  it.each([
    ['private', ['file.pdf']],
    ['public', ['']],
    ['public', ['.']],
    ['public', ['..']],
    ['public', ['folder\\file.png']],
  ])('rejects private or unsafe storage paths', async (folder, path) => {
    (isPublicStorageFolder as unknown as jest.Mock).mockReturnValue(
      folder === 'public',
    );
    await expect(
      controller.getPublicFile(folder, path, {} as any),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(serveStorageObject).not.toHaveBeenCalled();
  });
});
