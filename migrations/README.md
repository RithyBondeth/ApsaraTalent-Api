# Database migrations

Schema changes are applied **only** through the migrations in this directory.
TypeORM's `synchronize` is hard-forced to `false` in production
(`libs/common/src/config/configuration.ts`) and there is a unit test asserting it.

Several migrations began as loose `.sql` files applied by hand. They are now
TypeORM migration classes with the original SQL preserved verbatim, tracked in
a `migrations` table so the database knows what has and hasn't run.

## Commands

| Command | What it does |
|---|---|
| `npm run migration:show` | List migrations and whether each is applied |
| `npm run migration:run` | Apply all pending migrations |
| `npm run migration:revert` | Roll back the single most recent migration |
| `npm run migration:create migrations/DescribeTheChange` | Scaffold a new empty migration |
| `npm run migration:baseline` | Dry run: show what baselining would record |
| `npm run migration:baseline -- --apply` | Record migrations as applied **without running them** |
| `npm run db:rehearse` | Apply, revert and re-apply pending migrations on a throwaway branch of production |

All of these read `DATABASE_URL`, except `db:rehearse` — see below. `dotenv`
does **not** override variables that are already set, so an explicit
`DATABASE_URL=... npm run migration:run` always wins over `.env`.

> **Always check which database you are pointed at before running anything.**
> With no `DATABASE_URL` in the environment, these commands silently fall back
> to whatever is in `.env` — which is very likely not the one you meant.
> `migration:baseline` prints its target host and database for this reason.

## Rehearsing before you migrate

`npm run db:rehearse` answers the question the unit tests cannot: *will this
migration apply to the rows that are actually in production?*
`migrations.spec.ts` calls `up()` and `down()` against a mocked QueryRunner, so
it proves the SQL exists but never executes it. A NOT NULL over existing nulls,
a UNIQUE index over duplicates, or a backfill that overflows only fails on real
rows.

It reads `NEON_API_KEY` and `NEON_PROJECT_ID`, **not** `DATABASE_URL`. It
branches production copy-on-write, then sets `DATABASE_URL` itself per command
to point at that branch — which is what makes it structurally unable to migrate
production, and why it is safe to run by hand at any time. The branch and its
compute are deleted on the way out, including when a phase fails; pass
`REHEARSAL_KEEP_BRANCH=1` to keep it for inspection.

Three phases run, in order: `migration:run`, then `migration:revert` once per
pending migration, then `migration:run` again. The last one matters because
revert-fix-redeploy is the sequence RUNBOOK §5 prescribes, and a `down()` that
drops a column while leaving its index behind is reversible exactly once.

The revert phase is skipped when this release includes a migration listed as
intentionally irreversible — reverting past one proves nothing, and for
`HashRefreshTokens` it would mean writing plaintext refresh tokens back.

That list lives in one place, `migrations/irreversible.json`, keyed by TypeORM
class name. Both consumers read that file directly: `migrations.spec.ts` skips
its rollback-SQL contract for those entries, and
`scripts/ci/migration-rehearsal.mjs` skips its reverse phase. There is no second
copy to keep in step — add the key to the JSON and both follow.

This runs in CI on every push to `main`, gating the `migrate` job.

## First-time rollout against the existing production database

Baseline only when the target database already contains the effects of **every**
migration on disk but has no `migrations` table recording them. Audit the schema
first. If even one migration effect is missing, do not baseline the full set;
take a backup and run the idempotent migrations normally.

They are all written idempotently, so re-running would most likely be harmless —
but "most likely harmless" is not a deploy strategy, and the concurrent index
builds would still churn against live tables.

```bash
# 1. Take a backup first. Non-negotiable.
# 2. Confirm the target, and confirm every migration effect is already present.
DATABASE_URL="<production-url>" npm run migration:baseline          # dry run
# 3. Read the printed host/database. If it is right:
DATABASE_URL="<production-url>" npm run migration:baseline -- --apply
# 4. Confirm everything now reads as applied:
DATABASE_URL="<production-url>" npm run migration:show
```

From then on, production only needs `npm run migration:run`.

**Do not baseline a fresh, empty, or partially migrated database** — that would
mark missing changes as applied without creating them. Those databases should
run `migration:run`.

## Writing a new migration

```bash
npm run migration:create migrations/AddSomethingUseful
```

Then fill in `up()` and `down()`. Conventions used here:

- **Write `up()` idempotently** (`IF NOT EXISTS`, `DO $$ ... EXCEPTION`). It costs
  little and it makes a partially-failed non-transactional migration safe to retry.
- **Write a real `down()`** where reversal is meaningful. Where it genuinely is not —
  a many-to-one data normalization, an enum label Postgres cannot remove — leave
  `down()` empty *with a comment explaining why*. A `down()` that silently guesses
  is worse than one that admits it cannot.
- **Never edit a migration that has already run anywhere.** Add a new one.
- **Do not import application entities or services.** A migration describes the
  schema at a point in time; entities describe it today. Coupling them means old
  migrations break the moment the model moves on. Use raw SQL.

### Statements that cannot run inside a transaction

`migrationsTransactionMode` is `'each'`, so every migration runs in its own
transaction by default. Some Postgres statements are illegal inside one:

- `CREATE INDEX CONCURRENTLY` / `DROP INDEX CONCURRENTLY`
- `ALTER TYPE ... ADD VALUE` (pre-PG12; and on 12+ the new label cannot be used
  in the same transaction that adds it)

Opt those migrations out with a class property:

```ts
export class Example1234567890 implements MigrationInterface {
  transaction = false;
  // ...
}
```

**Known TypeORM limitation:** `transaction = false` is honoured when running
`up`, but *not* on revert — `undoLastMigration` always opens a transaction unless
the whole DataSource is set to `transaction: 'none'`. So a `down()` must never
use `CONCURRENTLY`. Use a plain `DROP INDEX`; it is a fast catalog operation, and
the brief lock is not the problem that made `CREATE ... CONCURRENTLY` necessary.

### Recovering from a cancelled CONCURRENTLY build

A `CREATE INDEX CONCURRENTLY` that is interrupted leaves an **invalid** index
behind. It consumes space and is never used by the planner. Find and drop them:

```sql
SELECT i.indexrelid::regclass AS index_name, i.indrelid::regclass AS table_name
FROM pg_index i
WHERE i.indisvalid = false;

DROP INDEX CONCURRENTLY <index_name>;
```

Then re-run `migration:run` — the `IF NOT EXISTS` guards let it finish the job.

## Deployment

Migrations are **not** run automatically at application boot. `migrationsRun` is
`false` and eight services share one database — booting them together would race
eight concurrent migration runs against each other.

Instead CI runs them once, as a release step, after the build passes and before
any service is deployed (`.github/workflows/deploy.yml`). This requires a
`DATABASE_URL` repository secret.

Note that the migration step runs via `ts-node`, not from `dist/`. The Nest build
bundles libraries into each service's `main.js` via webpack, so migration files do
not survive as separately loadable modules in the production image. Running them
from the CI checkout, where devDependencies are installed, sidesteps that.

### Ordering caveat

A migration that removes or renames something is only safe to apply *before* the
new code deploys if the currently-running code no longer references it. For
destructive changes use the expand/contract pattern: deploy the additive
migration, deploy the code, then remove the old column in a later release.
