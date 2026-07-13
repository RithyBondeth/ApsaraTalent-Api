import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PinoLogger, InjectPinoLogger } from 'nestjs-pino';
import OpenAI from 'openai';

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

@Injectable()
export class EmbeddingService {
  private readonly openAI: OpenAI;

  constructor(
    private readonly configService: ConfigService,
    @InjectPinoLogger(EmbeddingService.name)
    private readonly logger: PinoLogger,
  ) {
    this.openAI = new OpenAI({
      apiKey: this.configService.get<string>('openai.apiKey'),
    });
  }

  /**
   * Generate a text-embedding-3-small vector for the given text.
   * Returns a 1536-dimensional number array.
   */
  async embed(text: string): Promise<number[]> {
    const response = await this.openAI.embeddings.create({
      model: 'text-embedding-3-small',
      input: text.trim(),
    });
    return response.data[0].embedding;
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
