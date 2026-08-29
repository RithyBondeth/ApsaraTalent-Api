import OpenAI from 'openai';
import {
  EMBEDDING_CACHE_TTL_MS,
  EMBEDDING_DIMS,
  EmbeddingService,
} from './embedding.service';
import { generateEmbeddingKey } from '../redis/redis-keys.util';

const mockCreateEmbedding = jest.fn();
jest.mock('openai', () =>
  jest.fn().mockImplementation(() => ({
    embeddings: { create: mockCreateEmbedding },
  })),
);

/** A full-width vector, the only shape the cache will accept back. */
const vector = (fill: number) => Array<number>(EMBEDDING_DIMS).fill(fill);

describe('EmbeddingService', () => {
  const config = { get: jest.fn(() => 'test-api-key') };
  const logger = { warn: jest.fn() };
  const redis = { get: jest.fn(), set: jest.fn() };
  const service = new EmbeddingService(
    config as any,
    logger as any,
    redis as any,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    redis.get.mockResolvedValue(null);
    redis.set.mockResolvedValue(undefined);
  });

  it('initializes OpenAI with the configured API key', () => {
    new EmbeddingService(config as any, logger as any, redis as any);
    expect(OpenAI).toHaveBeenCalledWith({ apiKey: 'test-api-key' });
  });

  it('trims input and returns the provider embedding', async () => {
    mockCreateEmbedding.mockResolvedValue({
      data: [{ embedding: [0.1, 0.2] }],
    });
    await expect(service.embed('  Backend Engineer  ')).resolves.toEqual([
      0.1, 0.2,
    ]);
    expect(mockCreateEmbedding).toHaveBeenCalledWith({
      model: 'text-embedding-3-small',
      input: 'Backend Engineer',
    });
  });

  it('serializes vectors in pgvector format', () => {
    expect(service.toVector([0.1, -0.2, 3])).toBe('[0.1,-0.2,3]');
  });

  it('combines embedding and serialization', async () => {
    mockCreateEmbedding.mockResolvedValue({ data: [{ embedding: [1, 2] }] });
    await expect(service.embedAsVector('Engineer')).resolves.toBe('[1,2]');
  });

  it('propagates provider failures to the caller', async () => {
    mockCreateEmbedding.mockRejectedValue(new Error('OpenAI unavailable'));
    await expect(service.embed('Engineer')).rejects.toThrow(
      'OpenAI unavailable',
    );
  });

  describe('caching', () => {
    it('serves a cached vector without calling the provider', async () => {
      redis.get.mockResolvedValue(vector(0.5));
      await expect(service.embed('Backend Engineer')).resolves.toEqual(
        vector(0.5),
      );
      expect(mockCreateEmbedding).not.toHaveBeenCalled();
    });

    it('keys the cache on trimmed content, not raw input', async () => {
      redis.get.mockResolvedValue(vector(0.5));
      await service.embed('  Backend Engineer  ');
      expect(redis.get).toHaveBeenCalledWith(
        generateEmbeddingKey('Backend Engineer'),
      );
    });

    it('writes through to the cache on a miss', async () => {
      const fresh = vector(0.25);
      mockCreateEmbedding.mockResolvedValue({ data: [{ embedding: fresh }] });
      await service.embed('Backend Engineer');
      expect(redis.set).toHaveBeenCalledWith(
        generateEmbeddingKey('Backend Engineer'),
        fresh,
        EMBEDDING_CACHE_TTL_MS,
      );
    });

    it('ignores a cached value of the wrong dimension', async () => {
      redis.get.mockResolvedValue([0.1, 0.2]);
      mockCreateEmbedding.mockResolvedValue({
        data: [{ embedding: vector(0.9) }],
      });
      await expect(service.embed('Backend Engineer')).resolves.toEqual(
        vector(0.9),
      );
      expect(mockCreateEmbedding).toHaveBeenCalled();
    });

    it('still returns the embedding when the cache write rejects', async () => {
      const fresh = vector(0.25);
      mockCreateEmbedding.mockResolvedValue({ data: [{ embedding: fresh }] });
      redis.set.mockRejectedValue(new Error('Redis operation timed out'));
      await expect(service.embed('Backend Engineer')).resolves.toEqual(fresh);
    });
  });
});
