import { BadRequestException } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { UploadfileService } from './uploadfile.service';
import { UploadFilesInterceptor } from './uploadfiles.interceptor';

jest.mock('@nestjs/platform-express', () => ({
  FilesInterceptor: jest.fn(() => class MockFilesInterceptor {}),
}));
jest.mock('./uploadfile.service', () => ({
  UploadfileService: { storageOptions: jest.fn(() => ({ storage: true })) },
}));

describe('UploadFilesInterceptor', () => {
  beforeEach(() => jest.clearAllMocks());

  it('configures maximum count, size, storage, and MIME validation', () => {
    expect(
      UploadFilesInterceptor(
        'images',
        'company-images',
        5,
        ['image/png', 'image/jpeg'],
        2_000,
      ),
    ).toBeDefined();
    expect(UploadfileService.storageOptions).toHaveBeenCalledWith(
      'company-images',
    );
    expect(FilesInterceptor).toHaveBeenCalledWith(
      'images',
      5,
      expect.objectContaining({
        storage: { storage: true },
        limits: { fileSize: 2_000 },
        fileFilter: expect.any(Function),
      }),
    );
  });

  it('accepts allowed MIME types after removing MIME parameters', () => {
    UploadFilesInterceptor('images', 'folder', 3, ['image/png'], 100);
    const options = (FilesInterceptor as unknown as jest.Mock).mock.calls[0][2];
    const callback = jest.fn();
    options.fileFilter({}, { mimetype: 'image/png; charset=binary' }, callback);
    expect(callback).toHaveBeenCalledWith(null, true);
  });

  it.each([['image/gif'], [''], [undefined]])(
    'rejects a disallowed or missing MIME type: %s',
    (mimetype) => {
      UploadFilesInterceptor('images', 'folder', 3, ['image/png'], 100);
      const options = (FilesInterceptor as unknown as jest.Mock).mock
        .calls[0][2];
      const callback = jest.fn();
      options.fileFilter({}, { mimetype }, callback);
      expect(callback.mock.calls[0][0]).toBeInstanceOf(BadRequestException);
      expect(callback.mock.calls[0][0].message).toContain(
        'Allowed types: image/png',
      );
      expect(callback.mock.calls[0][1]).toBe(false);
    },
  );

  it('uses safe defaults when optional limits and filters are absent', () => {
    UploadFilesInterceptor('files', 'documents');
    expect(FilesInterceptor).toHaveBeenCalledWith(
      'files',
      10,
      expect.objectContaining({ limits: undefined, fileFilter: undefined }),
    );
  });
});
