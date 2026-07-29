import * as fs from 'fs';
import { StorageRegistry } from '../storage/storage.registry';
import { UploadfileService } from './uploadfile.service';

jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  existsSync: jest.fn(),
  unlink: jest.fn(),
}));

describe('UploadfileService', () => {
  const service = new UploadfileService();

  beforeEach(() => jest.clearAllMocks());
  afterEach(() => jest.restoreAllMocks());

  it('returns the public storage path for an uploaded file', () => {
    expect(
      service.getUploadFile('resumes', {
        filename: 'candidate.pdf',
      } as Express.Multer.File),
    ).toBe('/storage/resumes/candidate.pdf');
  });

  it('builds collision-resistant filenames while preserving the extension', () => {
    jest.spyOn(Date, 'now').mockReturnValue(1_000);
    jest.spyOn(Math, 'random').mockReturnValue(0.5);

    expect((UploadfileService as any).buildFilename('resume.final.pdf')).toBe(
      'resume-1000-500000000.pdf',
    );
  });

  it('deletes an existing local file', () => {
    jest.spyOn(StorageRegistry, 'isReady').mockReturnValue(false);
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    const unlink = fs.unlink as unknown as jest.Mock;
    unlink.mockImplementation((_path, callback) => callback(null));
    UploadfileService.deleteFile('/tmp/storage/resumes/cv.pdf', 'Resume');
    expect(unlink).toHaveBeenCalledWith(
      '/tmp/storage/resumes/cv.pdf',
      expect.any(Function),
    );
  });

  it('does not call local unlink for a missing file', () => {
    jest.spyOn(StorageRegistry, 'isReady').mockReturnValue(false);
    (fs.existsSync as jest.Mock).mockReturnValue(false);
    const unlink = fs.unlink as unknown as jest.Mock;
    UploadfileService.deleteFile('/missing/file.pdf', 'Resume');
    expect(unlink).not.toHaveBeenCalled();
  });

  it('deletes an S3 object using a normalized key', async () => {
    const remove = jest.fn().mockResolvedValue(undefined);
    jest.spyOn(StorageRegistry, 'isReady').mockReturnValue(true);
    jest.spyOn(StorageRegistry, 'get').mockReturnValue({
      driverName: 's3',
      delete: remove,
    } as any);

    UploadfileService.deleteFile('/storage/resumes/cv.pdf', 'Resume');
    await new Promise((resolve) => setImmediate(resolve));
    expect(remove).toHaveBeenCalledWith('resumes/cv.pdf');
  });

  it('refuses to delete an S3 key outside the storage root', () => {
    const remove = jest.fn();
    jest.spyOn(StorageRegistry, 'isReady').mockReturnValue(true);
    jest.spyOn(StorageRegistry, 'get').mockReturnValue({
      driverName: 's3',
      delete: remove,
    } as any);
    UploadfileService.deleteFile('/etc/passwd', 'Unsafe file');
    expect(remove).not.toHaveBeenCalled();
  });

  it('contains asynchronous S3 deletion failures', async () => {
    const remove = jest.fn().mockRejectedValue(new Error('S3 unavailable'));
    jest.spyOn(StorageRegistry, 'isReady').mockReturnValue(true);
    jest.spyOn(StorageRegistry, 'get').mockReturnValue({
      driverName: 's3',
      delete: remove,
    } as any);
    expect(() =>
      UploadfileService.deleteFile('/storage/resumes/cv.pdf', 'Resume'),
    ).not.toThrow();
    await new Promise((resolve) => setImmediate(resolve));
  });

  it('deletes an absolute storage path from S3 using its relative object key', async () => {
    const remove = jest.fn().mockResolvedValue(undefined);
    jest.spyOn(StorageRegistry, 'isReady').mockReturnValue(true);
    jest.spyOn(StorageRegistry, 'get').mockReturnValue({
      driverName: 's3',
      delete: remove,
    } as any);
    const absolute = `${process.cwd()}/storage/company-covers/cover.png`;

    UploadfileService.deleteFile(absolute, 'Cover');
    await new Promise((resolve) => setImmediate(resolve));

    expect(remove).toHaveBeenCalledWith('company-covers/cover.png');
  });

  it('falls back to local deletion when the configured driver is local', () => {
    jest.spyOn(StorageRegistry, 'isReady').mockReturnValue(true);
    jest.spyOn(StorageRegistry, 'get').mockReturnValue({
      driverName: 'local',
    } as any);
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    const unlink = fs.unlink as unknown as jest.Mock;
    unlink.mockImplementation((_path, callback) =>
      callback(new Error('permission denied')),
    );

    expect(() =>
      UploadfileService.deleteFile('/tmp/file.pdf', 'Document'),
    ).not.toThrow();
    expect(unlink).toHaveBeenCalled();
  });

  it('contains non-Error object-store rejections', async () => {
    const remove = jest.fn().mockRejectedValue('storage offline');
    jest.spyOn(StorageRegistry, 'isReady').mockReturnValue(true);
    jest.spyOn(StorageRegistry, 'get').mockReturnValue({
      driverName: 's3',
      delete: remove,
    } as any);

    UploadfileService.deleteFile('/storage/resumes/cv.pdf', 'Resume');
    await new Promise((resolve) => setImmediate(resolve));

    expect(remove).toHaveBeenCalledWith('resumes/cv.pdf');
  });
});
