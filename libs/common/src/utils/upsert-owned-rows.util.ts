import {
  DeepPartial,
  FindOptionsWhere,
  In,
  ObjectLiteral,
  Repository,
} from 'typeorm';

type WithId = ObjectLiteral & { id: string };

/**
 * Upsert a collection of child rows belonging to one parent.
 *
 * The profile-update services used to walk these collections one at a time,
 * issuing a `findOne` and a `save` per submitted row. A profile with three
 * experiences, two educations and three socials therefore spent sixteen
 * sequential round trips in a path the user experiences as "Save" — which
 * dominates the request as soon as the database is not on localhost. This does
 * the same work in one SELECT plus one bulk save per collection.
 *
 * Rows carrying an `id` are updated, but only if that id genuinely belongs to
 * `ownerWhere` — the ownership check is what stops one user editing another
 * user's rows by guessing an id, so it is applied in SQL rather than trusted
 * from the payload. Ids that do not match are skipped silently, exactly as the
 * per-row `findOne` did. Rows without an `id` are created against `ownerValue`.
 */
export async function upsertOwnedRows<T extends WithId>(
  repository: Repository<T>,
  rows: readonly (DeepPartial<T> & { id?: string })[],
  options: {
    /** Scopes the ownership lookup, e.g. `{ employee: { id: employeeId } }`. */
    ownerWhere: FindOptionsWhere<T>;
    /** Relation set on newly created rows, e.g. `{ employee }`. */
    ownerValue: DeepPartial<T>;
  },
): Promise<void> {
  if (rows.length === 0) return;

  const pending: DeepPartial<T>[] = [];
  const submittedIds = rows
    .map((row) => row?.id)
    .filter((id): id is string => Boolean(id));

  if (submittedIds.length > 0) {
    const owned = await repository.find({
      where: {
        ...options.ownerWhere,
        id: In(submittedIds),
      } as FindOptionsWhere<T>,
    });
    const ownedById = new Map(owned.map((row) => [row.id, row]));

    for (const row of rows) {
      if (!row?.id) continue;
      const target = ownedById.get(row.id);
      if (!target) continue;
      const patch = { ...row };
      delete patch.id;
      Object.assign(target, patch);
      pending.push(target as DeepPartial<T>);
    }
  }

  for (const row of rows) {
    if (row?.id) continue;
    pending.push(repository.create({ ...row, ...options.ownerValue }));
  }

  if (pending.length > 0) {
    await repository.save(pending);
  }
}
