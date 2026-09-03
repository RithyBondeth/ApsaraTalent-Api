import { EUserStatus } from '../database/enums/user-status.enum';

/**
 * SQL fragment that keeps a user off *discovery* surfaces — search,
 * recommendations, listings, the feed — while their account is not in good
 * standing.
 *
 * "Discovery" is deliberate: it does not cover relational surfaces. If a
 * candidate has already applied to a company that then gets suspended, the
 * candidate still sees their own application, the pair still matches, and any
 * chat between them still opens. Hiding those would delete a user's own
 * history from under them, which is worse than the small window where a
 * suspended account's existing connections stay visible.
 *
 * The condition is stricter than `EUserStatus = 'active'`:
 *
 *   - BANNED and SUSPENDED are both excluded.
 *   - A SUSPENDED row whose `suspendedUntil` has already passed is
 *     reinstated *at read time*. Nothing sweeps the table on the clock, and a
 *     candidate should not stay invisible for hours after their suspension
 *     expired. See `resolveEffectiveStatus` in user-status.util.ts for the same
 *     rule applied at the row level.
 *   - A NULL status is treated as ACTIVE, so a row written by a migration that
 *     preceded the column does not disappear from every listing.
 *
 * `alias` names the joined User table in the caller's query. Callers pass
 * `qb.andWhere(activeUserSql('user'))`.
 */
export function activeUserSql(alias: string): string {
  return `(
    COALESCE("${alias}"."status", '${EUserStatus.ACTIVE}') = '${EUserStatus.ACTIVE}'
    OR (
      "${alias}"."status" = '${EUserStatus.SUSPENDED}'
      AND "${alias}"."suspendedUntil" IS NOT NULL
      AND "${alias}"."suspendedUntil" <= now()
    )
  )`;
}

/**
 * The same rule as a TypeORM `FindOptionsWhere` fragment, for callers that use
 * the repository `find()` API instead of a query builder.
 *
 * Emitted as an array of two shapes joined by TypeORM's `OR`: matching ACTIVE
 * *or* matching SUSPENDED-and-expired. `Not` on the status alone would exclude
 * BANNED users but keep every SUSPENDED one, which is not the same rule.
 */
import { LessThanOrEqual } from 'typeorm';

export const activeUserFindClauses = () =>
  [
    { status: EUserStatus.ACTIVE },
    {
      status: EUserStatus.SUSPENDED,
      suspendedUntil: LessThanOrEqual(new Date()),
    },
  ] as const;
