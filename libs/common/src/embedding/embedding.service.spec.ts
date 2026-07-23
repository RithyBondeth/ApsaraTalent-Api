import OpenAI from 'openai';
import { EmbeddingService } from './embedding.service';

const mockCreateEmbedding = jest.fn();
jest.mock('openai', () =>
  jest.fn().mockImplementation(() => ({
    embeddings: { create: mockCreateEmbedding },
  })),
);

describe('EmbeddingService', () => {
  const config = { get: jest.fn(() => 'test-api-key') };
  const logger = {};
  const service = new EmbeddingService(config as any, logger as any);

  beforeEach(() => jest.clearAllMocks());

  it('initializes OpenAI with the configured API key', () => {
    new EmbeddingService(config as any, logger as any);
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
});
