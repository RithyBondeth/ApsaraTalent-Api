import { BadRequestException } from '@nestjs/common';
import { createUploadStorageEngine } from '@app/common';
import { chatUploadMulterOptions } from './chat-upload.config';

jest.mock('@app/common', () => ({
  createUploadStorageEngine: jest.fn((options: unknown) => options),
}));
jest.mock('uuid', () => ({ v4: () => 'fixed-uuid' }));

describe('chatUploadMulterOptions', () => {
  const filter = chatUploadMulterOptions.fileFilter as (
    req: any,
    file: any,
    callback: any,
  ) => void;

  it.each([
    'image/jpeg',
    'image/png; charset=binary',
    'audio/webm',
    'application/pdf',
    'text/plain',
  ])('accepts supported MIME type %s', (mimetype) => {
    const callback = jest.fn();
    filter({}, { mimetype }, callback);
    expect(callback).toHaveBeenCalledWith(null, true);
  });

  it.each(['application/x-msdownload', '', undefined])(
    'rejects unsupported MIME type %s',
    (mimetype) => {
      const callback = jest.fn();
      filter({}, { mimetype }, callback);
      expect(callback).toHaveBeenCalledWith(
        expect.any(BadRequestException),
        false,
      );
    },
  );

  it('generates date-partitioned folders and preserves file extensions', () => {
    const storageOptions = (createUploadStorageEngine as jest.Mock).mock
      .calls[0][0];
    jest.useFakeTimers().setSystemTime(new Date('2026-07-23T10:00:00Z'));
    expect(storageOptions.resolveFolder()).toBe('chat/2026-07-23');
    expect(
      storageOptions.resolveFilename({}, { originalname: 'resume.PDF' }),
    ).toBe('fixed-uuid.PDF');
    jest.useRealTimers();
  });
});
