import { BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadFileInterceptor } from './uploadfile.interceptor';

const mockIntercept = jest.fn(() => 'intercepted');
jest.mock('@nestjs/platform-express', () => ({
  FileInterceptor: jest.fn(
    () =>
      class {
        intercept = mockIntercept;
      },
  ),
}));
jest.mock('./uploadfile.service', () => ({
  UploadfileService: { storageOptions: jest.fn(() => ({ storage: true })) },
}));

describe('UploadFileInterceptor', () => {
  beforeEach(() => jest.clearAllMocks());

  it('configures file-size and MIME-type boundaries then delegates', () => {
    const interceptor = new UploadFileInterceptor(
      'file',
      'resumes',
      ['application/pdf'],
      1024,
    );
    const result = interceptor.intercept({} as any, {} as any);
    expect(result).toBe('intercepted');
    expect(FileInterceptor).toHaveBeenCalledWith(
      'file',
      expect.objectContaining({
        limits: { fileSize: 1024 },
        fileFilter: expect.any(Function),
      }),
    );
    const options = (FileInterceptor as unknown as jest.Mock).mock.calls[0][1];
    const callback = jest.fn();
    options.fileFilter(
      {},
      { mimetype: 'application/pdf; charset=binary' },
      callback,
    );
    expect(callback).toHaveBeenCalledWith(null, true);
    callback.mockClear();
    options.fileFilter({}, { mimetype: 'image/png' }, callback);
    expect(callback.mock.calls[0][0]).toBeInstanceOf(BadRequestException);
    expect(callback.mock.calls[0][1]).toBe(false);
  });

  it('omits optional limits and filters when not configured', () => {
    const interceptor = new UploadFileInterceptor('file', 'images');
    interceptor.intercept({} as any, {} as any);
    expect(FileInterceptor).toHaveBeenCalledWith(
      'file',
      expect.objectContaining({ limits: undefined, fileFilter: undefined }),
    );
  });
});
