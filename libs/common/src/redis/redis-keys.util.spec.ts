import {
  generateAiStreamKey,
  generateEmbeddingKey,
  generateMatchingKey,
} from './redis-keys.util';

describe('generateAiStreamKey', () => {
  it('stays inside the matching namespace so profile edits invalidate it', () => {
    // invalidateMatchingProfileCaches() clears `matching:*` under the job
    // prefix — this key must fall inside that sweep or it would outlive the
    // profile change that made it wrong.
    expect(generateAiStreamKey('ai-explanation', 'e1', 'c1')).toBe(
      'apsaratalent:job-service:matching:ai-explanation-stream:e1:c1',
    );
  });

  it('separates streamed text from the non-streaming DTO entry', () => {
    expect(generateAiStreamKey('ai-explanation', 'e1', 'c1')).not.toBe(
      generateMatchingKey('ai-explanation:e1', 'c1'),
    );
  });

  it('gives each variant its own entry', () => {
    const en = generateAiStreamKey('ai-explanation', 'e1', 'c1', 'en');
    const km = generateAiStreamKey('ai-explanation', 'e1', 'c1', 'km');
    expect(en).not.toBe(km);
    expect(km).toContain(':km:');
  });

  it('slugifies a free-text variant and drops unsafe characters', () => {
    expect(
      generateAiStreamKey(
        'ai-interview-prep',
        'e1',
        'c1',
        'Technical Round #2',
      ),
    ).toContain(':technical-round-2:');
  });
});

describe('generateEmbeddingKey', () => {
  it('keys on trimmed content, so padding does not split the entry', () => {
    expect(generateEmbeddingKey('  Backend Engineer  ')).toBe(
      generateEmbeddingKey('Backend Engineer'),
    );
  });

  it('gives different text different keys', () => {
    expect(generateEmbeddingKey('Backend Engineer')).not.toBe(
      generateEmbeddingKey('Frontend Engineer'),
    );
  });

  it('names the model, so a model change cannot reuse old vectors', () => {
    expect(generateEmbeddingKey('x')).toContain('text-embedding-3-small');
  });
});
