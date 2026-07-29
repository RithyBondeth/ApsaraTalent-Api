import { mkdtemp, rm, writeFile, mkdir } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { Readable } from 'stream';
import { LocalStorageDriver } from './local-storage.driver';
import { StorageService } from './storage.service';
import { StorageDriver } from './storage-driver.interface';

const streamToString = async (stream: Readable): Promise<string> => {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks).toString();
};

const makeService = (driver: StorageDriver) =>
  new StorageService(driver as never);

describe('StorageService path mapping', () => {
  const service = makeService(new LocalStorageDriver('/tmp/unused'));

  it('maps a key to the path persisted in the database', () => {
    expect(service.toStoredPath('employee-avatars/a.png')).toBe(
      '/storage/employee-avatars/a.png',
    );
  });

  it('round-trips a stored path back to a key', () => {
    expect(service.toKey('/storage/employee-avatars/a.png')).toBe(
      'employee-avatars/a.png',
    );
  });

  it('returns null for values that are not storage paths', () => {
    // Columns legitimately hold absolute URLs (social avatars) and nulls, so
    // callers pass raw database values straight in.
    expect(service.toKey('https://cdn.example.com/a.png')).toBeNull();
    expect(service.toKey(null)).toBeNull();
    expect(service.toKey(undefined)).toBeNull();
    expect(service.toKey('')).toBeNull();
    expect(service.toKey('/storage/')).toBeNull();
  });

  it('classifies public and private folders correctly', () => {
    // This boundary decides whether a file is world-readable. Getting it wrong
    // either breaks avatars or exposes resumes.
    expect(service.isPublic('employee-avatars/a.png')).toBe(true);
    expect(service.isPublic('company-images/logo.jpg')).toBe(true);
    expect(service.isPublic('resume-templates/modern.png')).toBe(true);
    expect(service.isPublic('resumes/cv.pdf')).toBe(false);
    expect(service.isPublic('cover-letters/letter.pdf')).toBe(false);
    expect(service.isPublic('chat/2026-07-18/a.webm')).toBe(false);
    expect(service.isPublic('unknown-folder/x.bin')).toBe(false);
  });

  it('reads the folder from a nested key', () => {
    expect(service.folderOf('chat/2026-07-18/a.webm')).toBe('chat');
  });
});

describe('LocalStorageDriver', () => {
  let root: string;
  let service: StorageService;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'apsara-storage-'));
    service = makeService(new LocalStorageDriver(root));
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it('writes a file and returns its stored path', async () => {
    const stored = await service.put(
      'employee-avatars/a.png',
      Buffer.from('DATA'),
    );
    expect(stored).toBe('/storage/employee-avatars/a.png');
    expect(await service.exists('employee-avatars/a.png')).toBe(true);
  });

  it('creates intermediate directories', async () => {
    await service.put('chat/2026-07-18/a.webm', Buffer.from('AUDIO'));
    expect(await service.exists('chat/2026-07-18/a.webm')).toBe(true);
  });

  it('reads back the bytes it wrote', async () => {
    await service.put('resumes/cv.pdf', Buffer.from('PDF'));
    const object = await service.get('resumes/cv.pdf');
    expect(await streamToString(object.stream)).toBe('PDF');
    expect(object.contentLength).toBe(3);
  });

  it('reports a missing file rather than throwing on exists()', async () => {
    expect(await service.exists('resumes/nope.pdf')).toBe(false);
  });

  it('throws NotFound when reading a missing file', async () => {
    await expect(service.get('resumes/nope.pdf')).rejects.toThrow();
  });

  it('deletes idempotently', async () => {
    await service.put('resumes/cv.pdf', Buffer.from('PDF'));
    await service.delete('resumes/cv.pdf');
    expect(await service.exists('resumes/cv.pdf')).toBe(false);
    // Deleting an already-absent file is the desired end state, not an error.
    await expect(service.delete('resumes/cv.pdf')).resolves.toBeUndefined();
  });

  it('refuses keys that escape the storage root', async () => {
    // Keys are built from user-influenced values, so traversal must be blocked
    // in the driver rather than assumed away at each call site.
    await expect(service.get('../../etc/passwd')).rejects.toThrow();
    await expect(
      service.put('../escape.txt', Buffer.from('x')),
    ).rejects.toThrow();
  });

  it('has no direct URL, signalling that callers must stream', async () => {
    await service.put('employee-avatars/a.png', Buffer.from('DATA'));
    expect(await service.getUrl('employee-avatars/a.png')).toBeNull();
  });

  it('finds a file written outside the service', async () => {
    await mkdir(join(root, 'resumes'), { recursive: true });
    await writeFile(join(root, 'resumes', 'external.pdf'), 'EXTERNAL');
    expect(await service.exists('resumes/external.pdf')).toBe(true);
  });
});
