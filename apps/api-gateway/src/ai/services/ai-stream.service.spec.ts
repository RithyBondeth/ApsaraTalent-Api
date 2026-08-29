import { CACHE_TTL } from '@app/contracts/constants/domain/cache-ttl.constant';
import { AiStreamService } from './ai-stream.service';

const mockCreate = jest.fn();

describe('AiStreamService', () => {
  // The service no longer builds its own client; it asks AiClientService for
  // the endpoint its task maps to.
  const aiClient = {
    forTask: jest.fn(() => ({
      client: { chat: { completions: { create: mockCreate } } },
      model: 'gpt-test',
    })),
  };
  const redis = { get: jest.fn(), set: jest.fn() };
  const build = () => new AiStreamService(aiClient as any, redis as any);

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

  beforeEach(() => {
    jest.clearAllMocks();
    redis.get.mockResolvedValue(null);
    redis.set.mockResolvedValue(undefined);
  });

  it('resolves the endpoint for the task it was given', async () => {
    mockCreate.mockResolvedValue(stream('hi'));
    await build().pipe('profileRefine', [], 0, response());
    expect(aiClient.forTask).toHaveBeenCalledWith('profileRefine');
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ model: 'gpt-test' }),
      expect.anything(),
    );
  });

  it('writes SSE headers, chunks, completion, and closes the response', async () => {
    mockCreate.mockResolvedValue(stream('Hello', ' world'));
    const res = response();
    await build().pipe(
      'profileRefine',
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
      build().pipe('profileRefine', [], 0, res),
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
    const promise = build().pipe('profileRefine', [], 0, res);
    res.closeHandlers[0]();
    await promise;
    expect(res.write).not.toHaveBeenCalledWith(expect.stringContaining('done'));
  });
  describe('caching', () => {
    const KEY = 'matching:ai-explanation-stream:e1:c1';

    it('replays a cached stream without calling the provider', async () => {
      redis.get.mockResolvedValue('Cached explanation.');
      const res = response();
      await build().pipe('matchExplanation', [], 0.3, res, undefined, KEY);

      expect(mockCreate).not.toHaveBeenCalled();
      expect(res.write).toHaveBeenCalledWith(
        expect.stringContaining('Cached explanation.'),
      );
      expect(res.write).toHaveBeenCalledWith(expect.stringContaining('done'));
      expect(res.end).toHaveBeenCalled();
    });

    it('stores the assembled text after a complete stream', async () => {
      mockCreate.mockResolvedValue(stream('Strong ', 'match.'));
      await build().pipe(
        'matchExplanation',
        [],
        0.3,
        response(),
        undefined,
        KEY,
      );
      expect(redis.set).toHaveBeenCalledWith(
        KEY,
        'Strong match.',
        CACHE_TTL.AI,
      );
    });

    it('does not cache a stream the client disconnected from', async () => {
      // The text is truncated mid-sentence at this point. Caching it would
      // serve the fragment to every later request for the same pair.
      const res = response();
      async function* dropMidway() {
        yield { choices: [{ delta: { content: 'Partial' } }] };
        res.closeHandlers[0]();
        yield { choices: [{ delta: { content: ' and truncated' } }] };
      }
      mockCreate.mockResolvedValue(dropMidway());

      await build().pipe('matchExplanation', [], 0.3, res, undefined, KEY);
      expect(redis.set).not.toHaveBeenCalled();
      expect(res.write).not.toHaveBeenCalledWith(
        expect.stringContaining('done'),
      );
    });

    it('does not cache after a provider failure', async () => {
      mockCreate.mockRejectedValue(new Error('provider down'));
      await build().pipe(
        'matchExplanation',
        [],
        0.3,
        response(),
        undefined,
        KEY,
      );
      expect(redis.set).not.toHaveBeenCalled();
    });

    it('skips the cache entirely when no key is given', async () => {
      mockCreate.mockResolvedValue(stream('Fresh'));
      await build().pipe('profileRefine', [], 0.7, response());
      expect(redis.get).not.toHaveBeenCalled();
      expect(redis.set).not.toHaveBeenCalled();
    });

    it('still streams when the cache read fails', async () => {
      redis.get.mockRejectedValue(new Error('redis down'));
      mockCreate.mockResolvedValue(stream('Live'));
      const res = response();
      await expect(
        build().pipe('matchExplanation', [], 0.3, res, undefined, KEY),
      ).resolves.toBeUndefined();
      expect(res.write).toHaveBeenCalledWith(expect.stringContaining('Live'));
    });
  });
});
