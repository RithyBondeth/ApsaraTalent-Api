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
  wanted: ReadonlyMap<string, DeepPartial<T>>,
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

  const created = await repository.save(
    [...missing.entries()].map(([key, extra]) =>
      repository.create({ ...extra, [column]: key } as DeepPartial<T>),
    ),
  );

  return { resolved: [...existing, ...created], created };
}
