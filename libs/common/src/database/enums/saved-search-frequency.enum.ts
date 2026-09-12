/**
 * How often a saved search runs its digest. Kept small on purpose — a per-hour
 * or per-instant option would need push, not email, and a "monthly" one is
 * long enough that the reader forgets what they saved.
 *
 * `OFF` is a first-class value rather than a nullable column: it lets a user
 * pause a search without losing its filters, and the dispatcher's picking
 * query stays a single predicate rather than "frequency IS NOT NULL AND ...".
 */
export enum ESavedSearchFrequency {
  OFF = 'off',
  DAILY = 'daily',
  WEEKLY = 'weekly',
}

/** How long between digests, per frequency. Consumed by the dispatcher. */
export const SAVED_SEARCH_FREQUENCY_INTERVAL_MS: Record<
  ESavedSearchFrequency,
  number
> = {
  [ESavedSearchFrequency.OFF]: Number.POSITIVE_INFINITY,
  [ESavedSearchFrequency.DAILY]: 24 * 60 * 60 * 1000,
  [ESavedSearchFrequency.WEEKLY]: 7 * 24 * 60 * 60 * 1000,
};
