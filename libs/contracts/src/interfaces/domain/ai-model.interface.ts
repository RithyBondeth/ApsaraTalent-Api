/**
 * Which model class a task runs on.
 *
 * `quality` is the expensive, most capable model. `fast` is a small, cheap
 * model — an order of magnitude less per token, and on a provider that may not
 * be OpenAI at all (any OpenAI-compatible endpoint works; see OPENAI_FAST_*).
 */
export type TAiModelTier = 'fast' | 'quality';

/** Every AI task on the platform that runs a chat completion. */
export type TAiTask =
  | 'resumeGenerate'
  | 'resumeImport'
  | 'resumeOptimize'
  | 'coverLetterDraft'
  | 'coverLetterPolish'
  | 'profileRefine'
  | 'matchExplanation'
  | 'interviewPrep'
  | 'skillGap'
  | 'resumeParse';

/**
 * The cost policy for the platform, in one table.
 *
 * Only the resume documents earn the expensive model: they produce long,
 * structured output that the user reads and judges directly, and
 * `resumeOptimize` in particular must hold an exact NDJSON shape, which is
 * where a weaker model is most likely to drift.
 *
 * Everything else is a short, heavily-constrained task — rewrite this bio in
 * 50-80 words, return a job title in 2-5 words, extract these fields — and a
 * small model does them well. `profileRefine` alone covers 12 UI entry points
 * and fires during both signup flows, so it is the highest-volume task on the
 * platform and the one that gains most from the cheap tier.
 *
 * To retune cost, change a value here — nothing else needs to move.
 */
export const AI_TASK_TIER: Record<TAiTask, TAiModelTier> = {
  resumeGenerate: 'quality',
  resumeImport: 'quality',
  resumeOptimize: 'quality',

  coverLetterDraft: 'fast',
  coverLetterPolish: 'fast',
  profileRefine: 'fast',
  matchExplanation: 'fast',
  interviewPrep: 'fast',
  skillGap: 'fast',
  resumeParse: 'fast',
};
