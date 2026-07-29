import OpenAI from 'openai';
import { AiStreamService } from './ai-stream.service';

const mockCreate = jest.fn();
jest.mock('openai', () =>
  jest.fn().mockImplementation(() => ({
    chat: { completions: { create: mockCreate } },
  })),
);

describe('AiStreamService', () => {
  const config = {
    get: jest.fn((key) => (key === 'openai.model' ? 'gpt-test' : 'key')),
  };

  function response() {
    const closeHandlers: Array<() => void> = [];
    return {
      writableEnded: false,
      setHeader: jest.fn(),
      flushHeaders: jest.fn(),
      write: jest.fn(),
      end: jest.fn(),
      once: jest.fn((_event, handler) => closeHandlers.push(handler)),
      off: jest.fn(),
      closeHandlers,
    } as any;
  }

  async function* stream(...texts: string[]) {
    for (const text of texts) yield { choices: [{ delta: { content: text } }] };
  }

  beforeEach(() => jest.clearAllMocks());

  it('initializes OpenAI and uses the configured model', () => {
    const service = new AiStreamService(config as any);
    expect(OpenAI).toHaveBeenCalledWith({ apiKey: 'key' });
    expect(service.model).toBe('gpt-test');
  });

  it('writes SSE headers, chunks, completion, and closes the response', async () => {
    mockCreate.mockResolvedValue(stream('Hello', ' world'));
    const res = response();
    await new AiStreamService(config as any).pipe(
      [{ role: 'user', content: 'Hi' }],
      0.2,
      res,
      100,
    );
    expect(res.setHeader).toHaveBeenCalledWith(
      'Content-Type',
      'text/event-stream; charset=utf-8',
    );
    expect(res.write).toHaveBeenCalledWith(expect.stringContaining('Hello'));
    expect(res.write).toHaveBeenCalledWith(expect.stringContaining('done'));
    expect(res.end).toHaveBeenCalled();
  });

  it('emits an SSE error without throwing after provider failure', async () => {
    mockCreate.mockRejectedValue(new Error('OpenAI unavailable'));
    const res = response();
    await expect(
      new AiStreamService(config as any).pipe([], 0, res),
    ).resolves.toBeUndefined();
    expect(res.write).toHaveBeenCalledWith(
      expect.stringContaining('OpenAI unavailable'),
    );
    expect(res.end).toHaveBeenCalled();
  });

  it('aborts and stops writing when the client disconnects', async () => {
    mockCreate.mockImplementation(async (_params, options) => {
      const source = stream('late');
      expect(options.signal).toBeDefined();
      return source;
    });
    const res = response();
    const promise = new AiStreamService(config as any).pipe([], 0, res);
    res.closeHandlers[0]();
    await promise;
    expect(res.write).not.toHaveBeenCalledWith(expect.stringContaining('done'));
  });
});
