import { BadRequestException } from '@nestjs/common';
import pdfParse from 'pdf-parse';
import { ResumeParseService } from './resume-parse.service';

const mockCreate = jest.fn();
jest.mock('openai', () =>
  jest.fn().mockImplementation(() => ({
    chat: { completions: { create: mockCreate } },
  })),
);
jest.mock('pdf-parse', () => jest.fn());

describe('ResumeParseService', () => {
  const config = { get: jest.fn(() => 'test') };
  const service = new ResumeParseService(config as any);

  beforeEach(() => jest.clearAllMocks());

  it('accepts only PDF files', async () => {
    await expect(
      service.parseResume(Buffer.from('text'), 'text/plain'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(pdfParse).not.toHaveBeenCalled();
  });

  it('returns an empty object for a PDF without text', async () => {
    (pdfParse as jest.Mock).mockResolvedValue({ text: '   ' });
    await expect(
      service.parseResume(Buffer.from('pdf'), 'application/pdf'),
    ).resolves.toEqual({});
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('extracts structured resume JSON with the supported model', async () => {
    (pdfParse as jest.Mock).mockResolvedValue({ text: 'Sok Dara, Engineer' });
    mockCreate.mockResolvedValue({
      choices: [
        { message: { content: '{"firstName":"Sok","jobTitle":"Engineer"}' } },
      ],
    });
    await expect(
      service.parseResume(Buffer.from('pdf'), 'application/pdf'),
    ).resolves.toEqual({
      firstName: 'Sok',
      jobTitle: 'Engineer',
    });
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ model: 'gpt-4o-mini', temperature: 0 }),
    );
  });

  it('returns empty structured data when OpenAI or JSON parsing fails', async () => {
    (pdfParse as jest.Mock).mockResolvedValue({ text: 'Resume' });
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: 'invalid json' } }],
    });
    await expect(
      service.parseResume(Buffer.from('pdf'), 'application/pdf'),
    ).resolves.toEqual({});
  });

  it('returns a user-safe error for unreadable PDFs', async () => {
    (pdfParse as jest.Mock).mockRejectedValue(new Error('corrupt'));
    await expect(
      service.parseResume(Buffer.from('bad'), 'application/pdf'),
    ).rejects.toThrow('Could not read this PDF');
  });
});
