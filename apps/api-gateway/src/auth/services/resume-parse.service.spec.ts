import { BadRequestException } from '@nestjs/common';
import { PDFParse } from 'pdf-parse';
import { ResumeParseService } from './resume-parse.service';

const mockCreate = jest.fn();
jest.mock('openai', () =>
  jest.fn().mockImplementation(() => ({
    chat: { completions: { create: mockCreate } },
  })),
);
// pdf-parse 2 exports a class rather than a function. `getText` and `destroy`
// are shared across instances so a test can drive the parse result and still
// assert the parser was released.
//
// The factory builds the instance inside `mockImplementation` rather than
// closing over a prebuilt object: jest hoists `jest.mock` above every const in
// this file, so anything dereferenced while the factory runs is still in its
// temporal dead zone. Reading these two inside the implementation defers that
// until a test actually constructs a parser.
const mockGetText = jest.fn();
const mockDestroy = jest.fn();
jest.mock('pdf-parse', () => ({
  PDFParse: jest.fn().mockImplementation(() => ({
    getText: mockGetText,
    destroy: mockDestroy,
  })),
}));

const mockPDFParse = PDFParse as unknown as jest.Mock;

describe('ResumeParseService', () => {
  const config = { get: jest.fn(() => 'test') };
  const service = new ResumeParseService(config as any);

  beforeEach(() => {
    jest.clearAllMocks();
    mockDestroy.mockResolvedValue(undefined);
  });

  it('accepts only PDF files', async () => {
    await expect(
      service.parseResume(Buffer.from('text'), 'text/plain'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(mockPDFParse).not.toHaveBeenCalled();
  });

  it('returns an empty object for a PDF without text', async () => {
    mockGetText.mockResolvedValue({ text: '   ' });
    await expect(
      service.parseResume(Buffer.from('pdf'), 'application/pdf'),
    ).resolves.toEqual({});
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('extracts structured resume JSON with the supported model', async () => {
    mockGetText.mockResolvedValue({ text: 'Sok Dara, Engineer' });
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
    mockGetText.mockResolvedValue({ text: 'Resume' });
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: 'invalid json' } }],
    });
    await expect(
      service.parseResume(Buffer.from('pdf'), 'application/pdf'),
    ).resolves.toEqual({});
  });

  it('returns a user-safe error for unreadable PDFs', async () => {
    mockGetText.mockRejectedValue(new Error('corrupt'));
    await expect(
      service.parseResume(Buffer.from('bad'), 'application/pdf'),
    ).rejects.toThrow('Could not read this PDF');
  });

  it('releases the parser after a successful parse', async () => {
    mockGetText.mockResolvedValue({ text: 'Sok Dara, Engineer' });
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: '{"firstName":"Sok"}' } }],
    });

    await service.parseResume(Buffer.from('pdf'), 'application/pdf');

    expect(mockDestroy).toHaveBeenCalledTimes(1);
  });

  it('releases the parser even when the PDF cannot be read', async () => {
    mockGetText.mockRejectedValue(new Error('corrupt'));

    await expect(
      service.parseResume(Buffer.from('bad'), 'application/pdf'),
    ).rejects.toThrow('Could not read this PDF');
    expect(mockDestroy).toHaveBeenCalledTimes(1);
  });

  it('keeps the user-facing error when releasing the parser also fails', async () => {
    mockGetText.mockRejectedValue(new Error('corrupt'));
    mockDestroy.mockRejectedValue(new Error('teardown exploded'));

    await expect(
      service.parseResume(Buffer.from('bad'), 'application/pdf'),
    ).rejects.toThrow('Could not read this PDF');
  });

  it('suppresses the page marker v2 would otherwise add', async () => {
    // A mock cannot reproduce the library's own text assembly, so the contract
    // pinned here is the argument. Without it an image-only PDF extracts as
    // '-- 1 of 1 --', which is truthy, and the textless short-circuit above
    // stops firing — verified against pdf-parse 2.4.5 directly.
    mockGetText.mockResolvedValue({ text: 'Sok Dara' });
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: '{}' } }],
    });

    await service.parseResume(Buffer.from('pdf'), 'application/pdf');

    expect(mockGetText).toHaveBeenCalledWith({ pageJoiner: '' });
  });
});
