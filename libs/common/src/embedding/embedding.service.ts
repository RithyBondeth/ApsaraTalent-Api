import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PinoLogger, InjectPinoLogger } from 'nestjs-pino';
import OpenAI from 'openai';
import { RedisService } from '../redis/redis.service';
import { generateEmbeddingKey } from '../redis/redis-keys.util';

/** Dimensions produced by text-embedding-3-small. Must match the migration. */
export const EMBEDDING_DIMS = 1536;

/**
 * Cosine-similarity threshold for CAREER SCOPE matching (0–1).
 * Lowered to 0.55 so that genuinely related but differently-named scopes
 * are connected (e.g. "Full Stack Development" ↔ "Software Development" = 0.578,
 * "DevOps Engineering" ↔ "Software Engineering" = 0.574).
 * Unrelated fields (e.g. Finance ↔ Marketing at ~0.52) still score 0.
 */
export const SCOPE_SIMILARITY_THRESHOLD = 0.55;

/**
 * Cosine-similarity threshold for JOB TITLE matching (0–1).
 * Kept at 0.70 — job titles are specific enough that we want tighter matching
 * ("Backend Engineer" ↔ "Backend Developer" = 0.762 passes, while
 *  "Backend Engineer" ↔ "Project Manager" = ~0.45 does not).
 */
export const JOB_TITLE_SIMILARITY_THRESHOLD = 0.7;

/**
 * How long a cached embedding lives. Long, because the value cannot go stale:
 * the same input always produces the same vector. The TTL exists only so that
 * one-off strings do not occupy Redis forever.
 */
export const EMBEDDING_CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

@Injectable()
export class EmbeddingService {
  private readonly openAI: OpenAI;

  constructor(
    private readonly configService: ConfigService,
    @InjectPinoLogger(EmbeddingService.name)
    private readonly logger: PinoLogger,
    private readonly redisService: RedisService,
  ) {
    this.openAI = new OpenAI({
      apiKey: this.configService.get<string>('openai.apiKey'),
    });
  }

  /**
   * Generate a text-embedding-3-small vector for the given text.
   * Returns a 1536-dimensional number array.
   *
   * Results are cached on a hash of the input. The provider bills per call but
   * the mapping is deterministic, so repeats are pure waste: a user toggling a
   * job title back to a previous value, or several users submitting the same
   * new career scope name concurrently.
   */
  async embed(text: string): Promise<number[]> {
    const input = text.trim();
    const key = generateEmbeddingKey(input);

    const cached = await this.redisService.get<number[]>(key);
    if (Array.isArray(cached) && cached.length === EMBEDDING_DIMS) {
      return cached;
    }

    const response = await this.openAI.embeddings.create({
      model: 'text-embedding-3-small',
      input,
    });
    const embedding = response.data[0].embedding;

    // Fire-and-forget: a cache write failure must not fail the embedding.
    // RedisService already swallows its own errors, so this only guards
    // against the operation timeout rejecting.
    void this.redisService
      .set(key, embedding, EMBEDDING_CACHE_TTL_MS)
      .catch((err: Error) =>
        this.logger.warn(`Failed to cache embedding: ${err.message}`),
      );

    return embedding;
  }

  /**
   * Convert a number[] to the pgvector literal format: '[0.1,0.2,...]'
   * Pass this string directly into a raw SQL parameter with a ::vector cast.
   */
  toVector(embedding: number[]): string {
    return `[${embedding.join(',')}]`;
  }

  /**
   * Generate an embedding for `text` and return it as a pgvector literal.
   * Convenience wrapper used by CareerScope write services.
   */
  async embedAsVector(text: string): Promise<string> {
    const embedding = await this.embed(text);
    return this.toVector(embedding);
  }
}
