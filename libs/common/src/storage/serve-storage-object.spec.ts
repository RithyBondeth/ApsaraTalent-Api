import { NotFoundException } from '@nestjs/common';
import { serveStorageObject } from './serve-storage-object';

describe('serveStorageObject', () => {
  const res = {
    setHeader: jest.fn(),
    redirect: jest.fn(),
  };
  const stream = { pipe: jest.fn() };
  const storage = {
    isPublic: jest.fn(),
    getUrl: jest.fn(),
    exists: jest.fn(),
    get: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('redirects public objects to their direct URL', async () => {
    storage.isPublic.mockReturnValue(true);
    storage.getUrl.mockResolvedValue('https://cdn.example.com/avatar.png');
    await serveStorageObject(res as any, storage as any, 'avatars/avatar.png');
    expect(res.setHeader).toHaveBeenCalledWith(
      'Cache-Control',
      'public, max-age=3600',
    );
    expect(res.redirect).toHaveBeenCalledWith(
      302,
      'https://cdn.example.com/avatar.png',
    );
    expect(storage.exists).not.toHaveBeenCalled();
  });

  it('streams private objects with browser metadata', async () => {
    storage.isPublic.mockReturnValue(false);
    storage.exists.mockResolvedValue(true);
    storage.get.mockResolvedValue({
      stream,
      contentType: 'application/pdf',
      contentLength: 42,
    });
    await serveStorageObject(res as any, storage as any, 'resumes/file.pdf', {
      disposition: 'inline; filename="resume.pdf"',
    });
    expect(res.setHeader).toHaveBeenCalledWith(
      'Cache-Control',
      'private, no-store',
    );
    expect(res.setHeader).toHaveBeenCalledWith(
      'Content-Type',
      'application/pdf',
    );
    expect(res.setHeader).toHaveBeenCalledWith('Content-Length', '42');
    expect(res.setHeader).toHaveBeenCalledWith(
      'Content-Disposition',
      'inline; filename="resume.pdf"',
    );
    expect(stream.pipe).toHaveBeenCalledWith(res);
  });

  it('falls back to streaming when a redirect URL cannot be generated', async () => {
    storage.isPublic.mockReturnValue(true);
    storage.getUrl.mockResolvedValue(null);
    storage.exists.mockResolvedValue(true);
    storage.get.mockResolvedValue({ stream });
    await serveStorageObject(res as any, storage as any, 'avatars/avatar.png');
    expect(stream.pipe).toHaveBeenCalledWith(res);
  });

  it('throws a stable 404 for missing objects', async () => {
    storage.isPublic.mockReturnValue(false);
    storage.exists.mockResolvedValue(false);
    await expect(
      serveStorageObject(res as any, storage as any, 'private/missing.pdf'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
