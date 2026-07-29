import { NotFoundException } from '@nestjs/common';
import { Readable } from 'stream';
import { S3StorageDriver } from './s3-storage.driver';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const mockClientSend = jest.fn();

jest.mock('@aws-sdk/client-s3', () => {
  class Command {
    constructor(public readonly input: any) {}
  }
  return {
    S3Client: jest.fn(() => ({ send: mockClientSend })),
    PutObjectCommand: Command,
    GetObjectCommand: Command,
    HeadObjectCommand: Command,
    DeleteObjectCommand: Command,
  };
});
jest.mock('@aws-sdk/s3-request-presigner', () => ({ getSignedUrl: jest.fn() }));

describe('S3StorageDriver', () => {
  const config = {
    bucket: 'bucket',
    region: 'ap-southeast-1',
    accessKeyId: 'key',
    secretAccessKey: 'secret',
    publicBaseUrl: 'https://cdn.example.com/',
    signedUrlExpirySeconds: 900,
  };
  let driver: S3StorageDriver;

  beforeEach(() => {
    jest.clearAllMocks();
    driver = new S3StorageDriver(config);
  });

  it('uploads private and public objects with the correct ACL policy', async () => {
    mockClientSend.mockResolvedValue({});
    await driver.put('private/file.pdf', Buffer.from('x'), {
      contentType: 'application/pdf',
    });
    expect(mockClientSend.mock.calls[0][0].input).toEqual(
      expect.objectContaining({
        Bucket: 'bucket',
        Key: 'private/file.pdf',
        ContentType: 'application/pdf',
      }),
    );
    expect(mockClientSend.mock.calls[0][0].input.ACL).toBeUndefined();

    await driver.put('public/avatar.png', Buffer.from('x'), {
      publicRead: true,
    });
    expect(mockClientSend.mock.calls[1][0].input.ACL).toBe('public-read');
  });

  it('gets object metadata and maps missing objects to HTTP 404', async () => {
    const stream = Readable.from('file');
    mockClientSend.mockResolvedValueOnce({
      Body: stream,
      ContentType: 'text/plain',
      ContentLength: 4,
    });
    await expect(driver.get('file.txt')).resolves.toEqual({
      stream,
      contentType: 'text/plain',
      contentLength: 4,
    });

    mockClientSend.mockRejectedValueOnce({ name: 'NoSuchKey' });
    await expect(driver.get('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('checks existence and only suppresses not-found errors', async () => {
    mockClientSend
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce({ $metadata: { httpStatusCode: 404 } })
      .mockRejectedValueOnce(new Error('credentials failed'));
    await expect(driver.exists('present')).resolves.toBe(true);
    await expect(driver.exists('missing')).resolves.toBe(false);
    await expect(driver.exists('error')).rejects.toThrow('credentials failed');
  });

  it('makes deletion idempotent while preserving unexpected failures', async () => {
    mockClientSend
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce({ name: 'NotFound' })
      .mockRejectedValueOnce(new Error('denied'));
    await expect(driver.delete('present')).resolves.toBeUndefined();
    await expect(driver.delete('missing')).resolves.toBeUndefined();
    await expect(driver.delete('denied')).rejects.toThrow('denied');
  });

  it('returns encoded CDN URLs for public keys', async () => {
    await expect(
      driver.getUrl('avatars/My Photo.png', { publicRead: true }),
    ).resolves.toBe('https://cdn.example.com/avatars/My%20Photo.png');
    expect(getSignedUrl).not.toHaveBeenCalled();
  });

  it('presigns private objects and degrades signing failures to streaming', async () => {
    (getSignedUrl as jest.Mock)
      .mockResolvedValueOnce('https://signed.example.com/file')
      .mockRejectedValueOnce(new Error('signing failed'));
    await expect(
      driver.getUrl('private/file.pdf', {
        expiresInSeconds: 60,
        responseContentDisposition: 'inline',
      }),
    ).resolves.toBe('https://signed.example.com/file');
    expect((getSignedUrl as jest.Mock).mock.calls[0][2]).toEqual({
      expiresIn: 60,
    });
    await expect(driver.getUrl('private/file.pdf')).resolves.toBeNull();
  });
});
