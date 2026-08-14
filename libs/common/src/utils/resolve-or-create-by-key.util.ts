import {
  DeepPartial,
  FindOptionsWhere,
  In,
  ObjectLiteral,
  Repository,
} from 'typeorm';

/**
 * Resolve a set of lookup rows by a unique text column, creating the ones that
 * do not exist yet, in one SELECT plus at most one bulk INSERT.
 *
 * The profile-update services previously ran a `findOne` — and, on a miss, a
 * `save` — for every submitted skill, career scope, benefit and value. Each of
 * those is a separate round trip, so editing a profile with ten skills cost up
 * to twenty of them in sequence. The lookup columns are unique, so a single
 * `IN (...)` answers the whole set at once.
 *
 * `wanted` maps the trimmed lookup value to the extra fields used only when the
 * row has to be created (a description, say). Callers that need to act on the
 * new rows specifically — generating an embedding, for instance — get them back
 * separately in `created`, since acting on `resolved` would redo the work for
 * rows that already existed.
 */
export async function resolveOrCreateByKey<T extends ObjectLiteral>(
  repository: Repository<T>,
  column: keyof T & string,
  // NoInfer so T is fixed by the repository alone. Without it TypeScript also
  // infers from this argument, unifies T with DeepPartial<Entity>, and every
  // field on the returned rows becomes optional — callers reading `row.id` then
  // see `number | undefined` for a column the entity declares as required.
  wanted: ReadonlyMap<string, DeepPartial<NoInfer<T>>>,
): Promise<{ resolved: T[]; created: T[] }> {
  if (wanted.size === 0) return { resolved: [], created: [] };

  const keys = [...wanted.keys()];
  const existing = await repository.find({
    where: { [column]: In(keys) } as FindOptionsWhere<T>,
  });

  const missing = new Map(wanted);
  for (const row of existing) {
    missing.delete(String(row[column]));
  }

  if (missing.size === 0) return { resolved: existing, created: [] };

  // `save()` is typed as returning `DeepPartial<T> & T`, which leaves every
  // field looking optional to callers reading `row.id` or `row.name`. These are
  // freshly persisted rows, so they are complete entities — narrowing here
  // keeps that assertion in one place instead of at each call site.
  const created = (await repository.save(
    [...missing.entries()].map(([key, extra]) =>
      repository.create({ ...extra, [column]: key } as DeepPartial<T>),
    ),
  )) as T[];

  return { resolved: [...existing, ...created], created };
}
