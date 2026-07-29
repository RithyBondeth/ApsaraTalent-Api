import { StorageRegistry } from './storage.registry';
import { createUploadStorageEngine } from './upload-storage.engine';
import { existsSync, mkdirSync } from 'fs';

const mockDiskEngine = {
  _handleFile: jest.fn(),
  _removeFile: jest.fn(),
};
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  mkdirSync: jest.fn(),
}));
jest.mock('multer', () => ({ diskStorage: jest.fn(() => mockDiskEngine) }));

const mockExistsSync = existsSync as jest.Mock;
const mockMkdirSync = mkdirSync as jest.Mock;

describe('createUploadStorageEngine', () => {
  const options = {
    resolveFolder: jest.fn(() => 'avatars'),
    resolveFilename: jest.fn(() => 'photo.png'),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    StorageRegistry.reset();
    mockExistsSync.mockReturnValue(true);
  });

  afterAll(() => StorageRegistry.reset());

  it('uses disk storage before the registry is ready', () => {
    const engine = createUploadStorageEngine(options);
    const callback = jest.fn();
    engine._handleFile({} as any, {} as any, callback);
    engine._removeFile({} as any, {} as any, callback);
    expect(mockDiskEngine._handleFile).toHaveBeenCalled();
    expect(mockDiskEngine._removeFile).toHaveBeenCalled();
  });

  it('creates a missing local folder and resolves the destination and filename', async () => {
    mockExistsSync.mockReturnValue(false);
    createUploadStorageEngine(options);
    const { diskStorage } = await import('multer');
    const diskOptions = (diskStorage as unknown as jest.Mock).mock.calls[0][0];
    const destinationCallback = jest.fn();
    const filenameCallback = jest.fn();
    diskOptions.destination({}, {}, destinationCallback);
    diskOptions.filename({}, {}, filenameCallback);
    expect(mockMkdirSync).toHaveBeenCalledWith(
      expect.stringContaining('storage/avatars'),
      { recursive: true },
    );
    expect(destinationCallback).toHaveBeenCalledWith(
      null,
      expect.stringContaining('storage/avatars'),
    );
    expect(filenameCallback).toHaveBeenCalledWith(null, 'photo.png');
  });

  it('uses the storage-service engine when S3 is active', async () => {
    const storage = {
      driverName: 's3',
      put: jest.fn().mockResolvedValue('/storage/avatars/photo.png'),
      toKey: jest.fn(() => 'avatars/photo.png'),
      delete: jest.fn().mockResolvedValue(undefined),
    };
    StorageRegistry.set(storage as any);
    const engine = createUploadStorageEngine(options);
    const { Readable } = await import('stream');
    const info = await new Promise<any>((resolve, reject) => {
      engine._handleFile(
        {} as any,
        {
          stream: Readable.from([Buffer.from('image')]),
          mimetype: 'image/png',
        } as any,
        (error, value) => (error ? reject(error) : resolve(value)),
      );
    });
    expect(storage.put).toHaveBeenCalledWith(
      'avatars/photo.png',
      Buffer.from('image'),
      {
        contentType: 'image/png',
      },
    );
    expect(info.path).toBe('/storage/avatars/photo.png');
  });
});
