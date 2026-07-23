#!/usr/bin/env bash
#
# Take a compressed, restorable logical backup of the Postgres database.
#
# This is a SAFE, read-only operation. Restores are deliberately NOT scripted —
# see docs/RUNBOOK.md, where each step is meant to be read and confirmed while
# someone is looking at it.
#
# Usage:
#   DATABASE_URL="postgresql://..." ./scripts/db/backup-db.sh [output-directory]
#
# Requires either a local pg_dump, or Docker (the script falls back to running
# pg_dump inside the same Postgres image used for e2e tests). The fallback also
# sidesteps the most common failure here: pg_dump refuses to run against a
# server NEWER than itself, and Neon upgrades faster than most laptops do.

set -euo pipefail

PG_IMAGE="pgvector/pgvector:pg16"
OUT_DIR="${1:-./backups}"

if [ -z "${DATABASE_URL:-}" ]; then
  echo "ERROR: DATABASE_URL is not set." >&2
  echo "Usage: DATABASE_URL=\"postgresql://...\" $0 [output-directory]" >&2
  exit 1
fi

# Neon serves a transaction-pooled endpoint on the "-pooler" host. pg_dump needs
# a direct session (it sets session state and holds a consistent snapshot), so
# strip the pooler suffix if present. Harmless on non-Neon hosts.
DIRECT_URL="${DATABASE_URL//-pooler/}"
if [ "$DIRECT_URL" != "$DATABASE_URL" ]; then
  echo "Note: using the direct (non-pooled) endpoint for pg_dump."
fi

# Print the target without credentials so a mistake is visible before it matters.
SAFE_TARGET="$(printf '%s' "$DIRECT_URL" | sed -E 's#://[^@]*@#://***@#; s#\?.*##')"
echo "Source: ${SAFE_TARGET}"

mkdir -p "$OUT_DIR"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUT_FILE="${OUT_DIR}/apsara-${STAMP}.dump"

echo "Target: ${OUT_FILE}"
echo "Dumping..."

# A half-written dump that looks like a backup is worse than no backup at all.
cleanup_partial() {
  if [ -f "$OUT_FILE" ]; then
    rm -f "$OUT_FILE"
    echo "Removed partial dump: ${OUT_FILE}" >&2
  fi
}
trap 'cleanup_partial' ERR

# --format=custom is required for selective/parallel pg_restore later.
# --no-owner/--no-privileges keep the dump portable across roles, which matters
# when restoring into a fresh Neon branch or a local container.
DUMP_ARGS=(--format=custom --no-owner --no-privileges --verbose)

if command -v pg_dump >/dev/null 2>&1; then
  pg_dump "$DIRECT_URL" "${DUMP_ARGS[@]}" > "$OUT_FILE"
elif command -v docker >/dev/null 2>&1; then
  # --network host so a localhost/127.0.0.1 DATABASE_URL still resolves from
  # inside the container. Harmless for remote hosts like Neon.
  docker run --rm -i --network host "$PG_IMAGE" \
    pg_dump "$DIRECT_URL" "${DUMP_ARGS[@]}" > "$OUT_FILE"
else
  echo "ERROR: neither pg_dump nor docker is available." >&2
  exit 1
fi

# A dump that cannot be listed cannot be restored. Verifying now beats
# discovering it during an incident.
echo "Verifying dump is readable..."
if command -v pg_restore >/dev/null 2>&1; then
  OBJECTS="$(pg_restore --list "$OUT_FILE" | grep -cE 'TABLE|INDEX|EXTENSION' || true)"
else
  OBJECTS="$(docker run --rm -i "$PG_IMAGE" pg_restore --list < "$OUT_FILE" \
    | grep -cE 'TABLE|INDEX|EXTENSION' || true)"
fi

if [ "${OBJECTS:-0}" -lt 1 ]; then
  echo "ERROR: dump contains no recognisable objects — treat it as FAILED." >&2
  exit 1
fi

SIZE="$(du -h "$OUT_FILE" | cut -f1)"
echo ""
echo "Backup complete: ${OUT_FILE} (${SIZE}, ${OBJECTS} objects)"
echo "A backup is only real once it has been restored — see docs/RUNBOOK.md."
