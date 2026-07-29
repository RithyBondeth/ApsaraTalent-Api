import { UploadfileService } from '@app/common/uploadfile/uploadfile.service';
import { RpcException } from '@nestjs/microservices';
import { ImageCompanyService } from './image-company.service';

describe('ImageCompanyService', () => {
  const companies = { findOne: jest.fn(), save: jest.fn() };
  const images = {
    findOne: jest.fn(),
    create: jest.fn((data) => data),
    save: jest.fn(),
    delete: jest.fn(),
  };
  const uploads = { getUploadFile: jest.fn() };
  const logger = { info: jest.fn(), error: jest.fn() };
  const cache = {
    invalidateCompanyCache: jest.fn(),
  };
  const service = new ImageCompanyService(
    companies as any,
    images as any,
    uploads as any,
    logger as any,
    cache as any,
  );
  const file = { filename: 'new.png' } as Express.Multer.File;

  beforeEach(() => {
    jest.clearAllMocks();
    companies.save.mockImplementation(async (value) => value);
    images.save.mockImplementation(async (value) => value);
    uploads.getUploadFile.mockImplementation(
      (folder, uploaded) => `/storage/${folder}/${uploaded.filename}`,
    );
    jest.spyOn(UploadfileService, 'deleteFile').mockImplementation(() => true);
  });

  async function expectRpc(
    promise: Promise<unknown>,
    statusCode: number,
    message: string,
  ) {
    const error = (await promise.catch((caught) => caught)) as RpcException;
    expect(error).toBeInstanceOf(RpcException);
    expect(error.getError()).toEqual({ statusCode, message });
  }

  it('removes an orphan avatar upload for a missing company', async () => {
    companies.findOne.mockResolvedValue(null);
    await expectRpc(
      service.uploadCompanyAvatar({ companyId: 'missing', avatar: file }),
      404,
      'There is no company with this ID',
    );
    expect(UploadfileService.deleteFile).toHaveBeenCalledWith(
      expect.stringContaining('storage/company-avatars/new.png'),
      'Avatar Image',
    );
  });

  it('replaces an avatar and invalidates linked-user caches', async () => {
    const company = { id: 'company-1', avatar: '/old/avatar.png' };
    companies.findOne.mockResolvedValue(company);

    await service.uploadCompanyAvatar({ companyId: 'company-1', avatar: file });

    expect(company.avatar).toBe('/storage/company-avatars/new.png');
    expect(UploadfileService.deleteFile).toHaveBeenCalledWith(
      expect.stringContaining('storage/company-avatars/avatar.png'),
      'Old Avatar Image',
    );
    expect(cache.invalidateCompanyCache).toHaveBeenCalledWith('company-1');
  });

  it('removes an existing avatar', async () => {
    const company = { id: 'company-1', avatar: '/avatars/avatar.png' };
    companies.findOne.mockResolvedValue(company);
    await service.removeCompanyAvatar({ companyId: 'company-1' });
    expect(company.avatar).toBeNull();
    expect(companies.save).toHaveBeenCalledWith(company);
  });

  it('replaces and removes a cover image', async () => {
    const company = { id: 'company-1', cover: '/covers/old.png' };
    companies.findOne.mockResolvedValue(company);

    await service.uploadCompanyCover({ companyId: 'company-1', cover: file });
    expect(company.cover).toBe('/storage/company-covers/new.png');
    expect(UploadfileService.deleteFile).toHaveBeenCalledWith(
      expect.stringContaining('storage/company-covers/old.png'),
      'Old Cover Image',
    );

    await service.removeCompanyCover({ companyId: 'company-1' });
    expect(company.cover).toBeNull();
    expect(cache.invalidateCompanyCache).toHaveBeenCalledWith('company-1');
  });

  it('removes all orphan gallery files for a missing company', async () => {
    companies.findOne.mockResolvedValue(null);
    const files = [
      { filename: 'one.png' },
      { filename: 'two.png' },
    ] as Express.Multer.File[];
    await expectRpc(
      service.uploadCompanyImages({ companyId: 'missing', images: files }),
      404,
      'There is no company with this ID',
    );
    expect(UploadfileService.deleteFile).toHaveBeenCalledTimes(2);
    expect(images.save).not.toHaveBeenCalled();
  });

  it('stores gallery image records associated with the company', async () => {
    const company = { id: 'company-1' };
    companies.findOne.mockResolvedValue(company);
    const files = [
      { filename: 'one.png' },
      { filename: 'two.png' },
    ] as Express.Multer.File[];

    await service.uploadCompanyImages({
      companyId: 'company-1',
      images: files,
    });

    expect(images.create).toHaveBeenNthCalledWith(1, {
      company,
      image: '/storage/company-images/one.png',
    });
    expect(images.save).toHaveBeenCalledWith([
      { company, image: '/storage/company-images/one.png' },
      { company, image: '/storage/company-images/two.png' },
    ]);
  });

  it('prevents deleting a gallery image owned by another company', async () => {
    images.findOne.mockResolvedValue(null);
    await expectRpc(
      service.removeCompanyImage({
        companyId: 'company-1',
        imageId: 'image-1',
      }),
      404,
      "There's no image with this ID",
    );
    expect(images.delete).not.toHaveBeenCalled();
  });

  it('deletes an owned gallery image from storage and database', async () => {
    images.findOne.mockResolvedValue({
      id: 'image-1',
      image: '/company-images/photo.png',
    });
    await service.removeCompanyImage({
      companyId: 'company-1',
      imageId: 'image-1',
    });
    expect(UploadfileService.deleteFile).toHaveBeenCalledWith(
      expect.stringContaining('storage/company-images/photo.png'),
      'Company Image',
    );
    expect(images.delete).toHaveBeenCalledWith({ id: 'image-1' });
  });

  it('returns an internal RPC error when persistence fails', async () => {
    companies.findOne.mockResolvedValue({ id: 'company-1' });
    companies.save.mockRejectedValue(new Error('database unavailable'));
    await expectRpc(
      service.uploadCompanyAvatar({ companyId: 'company-1', avatar: file }),
      500,
      'database unavailable',
    );
  });

  it.each([
    ['removeCompanyAvatar', { companyId: 'missing' }],
    ['removeCompanyCover', { companyId: 'missing' }],
  ])('preserves missing-company errors from %s', async (method, dto) => {
    companies.findOne.mockResolvedValue(null);
    await expectRpc(
      (service as any)[method](dto),
      404,
      'There is no company with this ID',
    );
  });

  it('cleans up an orphan cover upload', async () => {
    companies.findOne.mockResolvedValue(null);
    await expectRpc(
      service.uploadCompanyCover({ companyId: 'missing', cover: file }),
      404,
      'There is no company with this ID',
    );
    expect(UploadfileService.deleteFile).toHaveBeenCalledWith(
      expect.stringContaining('storage/company-covers/new.png'),
      'Cover Image',
    );
  });

  it.each([
    [
      'removeCompanyAvatar',
      { companyId: 'company-1' },
      { id: 'company-1', avatar: '/avatars/a.png' },
    ],
    [
      'uploadCompanyCover',
      { companyId: 'company-1', cover: file },
      { id: 'company-1' },
    ],
    [
      'removeCompanyCover',
      { companyId: 'company-1' },
      { id: 'company-1', cover: '/covers/c.png' },
    ],
  ])(
    'wraps image replacement/removal failures from %s',
    async (method, dto, company) => {
      companies.findOne.mockResolvedValue(company);
      companies.save.mockRejectedValueOnce(new Error('write failed'));
      await expectRpc((service as any)[method](dto), 500, 'write failed');
    },
  );

  it('wraps gallery persistence, deletion, and cache invalidation failures', async () => {
    companies.findOne.mockResolvedValue({ id: 'company-1' });
    images.save.mockRejectedValueOnce(new Error('gallery write failed'));
    await expectRpc(
      service.uploadCompanyImages({ companyId: 'company-1', images: [file] }),
      500,
      'gallery write failed',
    );

    images.findOne.mockResolvedValueOnce({
      id: 'image-1',
      image: '/images/x.png',
    });
    images.delete.mockRejectedValueOnce(new Error('delete failed'));
    await expectRpc(
      service.removeCompanyImage({
        companyId: 'company-1',
        imageId: 'image-1',
      }),
      500,
      'delete failed',
    );

    companies.findOne.mockResolvedValueOnce({ id: 'company-1' });
    cache.invalidateCompanyCache.mockRejectedValueOnce(
      new Error('cache lookup failed'),
    );
    await expectRpc(
      service.uploadCompanyAvatar({ companyId: 'company-1', avatar: file }),
      500,
      'cache lookup failed',
    );
  });

  it.each([
    [
      'uploadCompanyAvatar',
      { companyId: 'company-1', avatar: file },
      { id: 'company-1' },
      "An error occurred while uploading the company's avatar.",
    ],
    [
      'removeCompanyAvatar',
      { companyId: 'company-1' },
      { id: 'company-1', avatar: '/avatars/a.png' },
      "An error occurred while removing the company's avatar.",
    ],
    [
      'uploadCompanyCover',
      { companyId: 'company-1', cover: file },
      { id: 'company-1' },
      "An error occurred while uploading the company's cover.",
    ],
    [
      'removeCompanyCover',
      { companyId: 'company-1' },
      { id: 'company-1', cover: '/covers/c.png' },
      "An error occurred while removing the company's cover.",
    ],
  ])(
    'uses a stable fallback when %s receives a null persistence failure',
    async (method, dto, company, message) => {
      companies.findOne.mockResolvedValue(company);
      companies.save.mockRejectedValueOnce(null);
      await expectRpc((service as any)[method](dto), 500, message);
    },
  );

  it('uses stable fallbacks for malformed gallery failures', async () => {
    companies.findOne.mockResolvedValue({ id: 'company-1' });
    images.save.mockRejectedValueOnce(null);
    await expectRpc(
      service.uploadCompanyImages({
        companyId: 'company-1',
        images: [file],
      }),
      500,
      "An error occurred while uploading the company's images.",
    );

    images.findOne.mockResolvedValueOnce({
      id: 'image-1',
      image: '/images/x.png',
    });
    images.delete.mockRejectedValueOnce(null);
    await expectRpc(
      service.removeCompanyImage({
        companyId: 'company-1',
        imageId: 'image-1',
      }),
      500,
      "An error occurred while removing the company's image.",
    );
  });
});
