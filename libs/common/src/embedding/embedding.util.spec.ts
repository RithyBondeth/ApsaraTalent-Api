import {
  cosineSimilarity,
  jobTitleSimilarityScore,
  parseEmbedding,
  scopeSetSimilarityScore,
} from './embedding.util';

describe('embedding utilities', () => {
  it('parses valid vectors and rejects absent or malformed values', () => {
    expect(parseEmbedding('[1,2,3]')).toEqual([1, 2, 3]);
    expect(parseEmbedding(null)).toBeNull();
    expect(parseEmbedding('not-json')).toBeNull();
  });

  it('computes cosine similarity and handles incompatible vectors', () => {
    expect(cosineSimilarity([1, 0], [1, 0])).toBe(1);
    expect(cosineSimilarity([1, 0], [0, 1])).toBe(0);
    expect(cosineSimilarity([], [])).toBe(0);
    expect(cosineSimilarity([1], [1, 2])).toBe(0);
    expect(cosineSimilarity([0, 0], [1, 1])).toBe(0);
  });

  it('scores only relevant embedded job titles', () => {
    expect(
      jobTitleSimilarityScore([1, 0], [{ titleEmbedding: '[1,0]' }], 20),
    ).toBe(20);
    expect(
      jobTitleSimilarityScore([1, 0], [{ titleEmbedding: '[0,1]' }], 20),
    ).toBe(0);
    expect(
      jobTitleSimilarityScore(null, [{ titleEmbedding: '[1,0]' }], 20),
    ).toBe(0);
    expect(jobTitleSimilarityScore([1, 0], [], 20)).toBe(0);
  });

  it('falls back to exact scope overlap without embeddings', () => {
    expect(
      scopeSetSimilarityScore(
        [{ id: 'a' }, { id: 'b' }],
        [{ id: 'b' }, { id: 'c' }],
        40,
      ),
    ).toBe(20);
    expect(scopeSetSimilarityScore([], [{ id: 'a' }], 40)).toBe(0);
  });

  it('averages relevant semantic scope matches and skips missing vectors', () => {
    const score = scopeSetSimilarityScore(
      [
        { id: 'a', embedding: '[1,0]' },
        { id: 'b', embedding: null },
        { id: 'c', embedding: '[0,1]' },
      ],
      [
        { id: 'x', embedding: '[1,0]' },
        { id: 'y', embedding: '[0,-1]' },
      ],
      40,
    );
    expect(score).toBe(20);
  });
});
