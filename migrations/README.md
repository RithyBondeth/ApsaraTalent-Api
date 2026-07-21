# Database migrations

Schema changes are applied **only** through the migrations in this directory.
TypeORM's `synchronize` is hard-forced to `false` in production
(`libs/common/src/config/configuration.ts`) and there is a unit test asserting it.

Until 2026-07-18 these were loose `.sql` files applied by hand. They are now
TypeORM migration classes with the original SQL preserved verbatim, tracked in a
`migrations` table so the database knows what has and hasn't run.

## Commands

| Command | What it does |
|---|---|
| `npm run migration:show` | List migrations and whether each is applied |
| `npm run migration:run` | Apply all pending migrations |
| `npm run migration:revert` | Roll back the single most recent migration |
| `npm run migration:create migrations/DescribeTheChange` | Scaffold a new empty migration |
| `npm run migration:baseline` | Dry run: show what baselining would record |
| `npm run migration:baseline -- --apply` | Record migrations as applied **without running them** |

All of these read `DATABASE_URL`. `dotenv` does **not** override variables that
are already set, so an explicit `DATABASE_URL=... npm run migration:run` always
wins over `.env`.

> **Always check which database you are pointed at before running anything.**
> With no `DATABASE_URL` in the environment, these commands silently fall back
> to whatever is in `.env` — which is very likely not the one you meant.
> `migration:baseline` prints its target host and database for this reason.

## First-time rollout against the existing production database

Production already contains the effects of all nine migrations, because they were
applied by hand. It just has no `migrations` table recording that. **Baseline it
once**, otherwise `migration:run` re-executes all nine.

They are all written idempotently, so re-running would most likely be harmless —
but "most likely harmless" is not a deploy strategy, and the concurrent index
builds would still churn against live tables.

```bash
# 1. Take a backup first. Non-negotiable.
# 2. Confirm the target, and confirm the schema really is up to date.
DATABASE_URL="<production-url>" npm run migration:baseline          # dry run
# 3. Read the printed host/database. If it is right:
DATABASE_URL="<production-url>" npm run migration:baseline -- --apply
# 4. Confirm everything now reads as applied:
DATABASE_URL="<production-url>" npm run migration:show
```

From then on, production only needs `npm run migration:run`.

**Do not baseline a fresh or empty database** — that would mark migrations as
applied without creating anything. Fresh databases (local, CI, a new staging
environment) just run `migration:run`.

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
