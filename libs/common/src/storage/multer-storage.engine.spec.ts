import { Readable } from 'stream';
import { StorageRegistry } from './storage.registry';
import { StorageServiceEngine } from './multer-storage.engine';

describe('StorageServiceEngine', () => {
  const storage = {
    put: jest.fn(),
    toKey: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    StorageRegistry.set(storage as any);
  });

  afterAll(() => StorageRegistry.reset());

  it('buffers and stores an uploaded file using resolved paths', async () => {
    storage.put.mockResolvedValue('/storage/chat/file.txt');
    const engine = new StorageServiceEngine(
      async () => 'chat/',
      async () => 'file.txt',
    );
    const file = {
      stream: Readable.from([Buffer.from('hello'), Buffer.from(' world')]),
      mimetype: 'text/plain',
    } as any;
    const info = await new Promise<any>((resolve, reject) => {
      engine._handleFile({} as any, file, (error, value) =>
        error ? reject(error) : resolve(value),
      );
    });
    expect(storage.put).toHaveBeenCalledWith(
      'chat/file.txt',
      Buffer.from('hello world'),
      {
        contentType: 'text/plain',
      },
    );
    expect(info).toEqual({
      filename: 'file.txt',
      path: '/storage/chat/file.txt',
      size: 11,
    });
  });

  it('passes upload errors to Multer', async () => {
    storage.put.mockRejectedValue(new Error('storage unavailable'));
    const engine = new StorageServiceEngine(
      () => 'chat',
      () => 'file.txt',
    );
    const error = await new Promise<Error>((resolve) => {
      engine._handleFile(
        {} as any,
        {
          stream: Readable.from([Buffer.from('x')]),
          mimetype: 'text/plain',
        } as any,
        (caught) => resolve(caught),
      );
    });
    expect(error.message).toBe('storage unavailable');
  });

  it('deletes known storage files and ignores non-storage paths', async () => {
    const engine = new StorageServiceEngine(
      () => 'chat',
      () => 'file.txt',
    );
    storage.toKey
      .mockReturnValueOnce('chat/file.txt')
      .mockReturnValueOnce(null);
    await new Promise<void>((resolve, reject) => {
      engine._removeFile(
        {} as any,
        { path: '/storage/chat/file.txt' } as any,
        (error) => (error ? reject(error) : resolve()),
      );
    });
    expect(storage.delete).toHaveBeenCalledWith('chat/file.txt');
    await new Promise<void>((resolve, reject) => {
      engine._removeFile({} as any, { path: 'external-url' } as any, (error) =>
        error ? reject(error) : resolve(),
      );
    });
    expect(storage.delete).toHaveBeenCalledTimes(1);
  });

  it('passes deletion errors to Multer', async () => {
    const engine = new StorageServiceEngine(
      () => 'chat',
      () => 'file.txt',
    );
    storage.toKey.mockReturnValue('chat/file.txt');
    storage.delete.mockRejectedValue(new Error('delete failed'));
    const error = await new Promise<Error>((resolve) => {
      engine._removeFile(
        {} as any,
        { path: '/storage/chat/file.txt' } as any,
        (caught) => resolve(caught as Error),
      );
    });
    expect(error.message).toBe('delete failed');
  });
});
