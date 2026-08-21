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
# pg_dump inside a Postgres image). The fallback exists to sidestep the most
# common failure here: pg_dump refuses to run against a server NEWER than
# itself, and Neon upgrades faster than most laptops — or GitHub runners — do.
#
# That fallback could not fire until 2026-08-21: it sat behind `elif`, so it was
# reached only when NO local pg_dump existed. A GitHub runner ships one, so the
# too-old client always won the branch and the nightly backup failed four nights
# running (Neon 17.11 vs pg_dump 16.15) with the container that would have
# worked sitting right there. The local client is now a preference rather than a
# commitment: if it fails for any reason and Docker is available, the dump is
# retried in the container.

set -euo pipefail

# Must be >= the server's major version, because pg_dump cannot read a newer
# server. Neon upgrades on their own schedule, so when a dump fails with
# `server version mismatch`, take the server version from the error message and
# bump this. (Neon was on 17.11 when this was last set.)
PG_IMAGE="pgvector/pgvector:pg17"
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

# pg_dump's stderr is captured rather than streamed so that a first-choice
# failure can be explained instead of just retried, and so the version-mismatch
# hint below has something to read.
ERR_FILE="$(mktemp)"
trap 'rm -f "$ERR_FILE"' EXIT

# --format=custom is required for selective/parallel pg_restore later.
# --no-owner/--no-privileges keep the dump portable across roles, which matters
# when restoring into a fresh Neon branch or a local container.
DUMP_ARGS=(--format=custom --no-owner --no-privileges --verbose)

# The dump and the verification below must use the SAME client. A custom-format
# archive written by pg_dump 17 cannot be read by pg_restore 16, so a mixed pair
# fails at the verify step even when the dump itself was perfectly good.
USED_DOCKER=0

dump_locally() {
  pg_dump "$DIRECT_URL" "${DUMP_ARGS[@]}" > "$OUT_FILE" 2>"$ERR_FILE"
}

dump_in_docker() {
  # --network host so a localhost/127.0.0.1 DATABASE_URL still resolves from
  # inside the container. Harmless for remote hosts like Neon.
  docker run --rm -i --network host "$PG_IMAGE" \
    pg_dump "$DIRECT_URL" "${DUMP_ARGS[@]}" > "$OUT_FILE" 2>"$ERR_FILE"
}

# Whoever reads a failed nightly run should not have to work out what a bare
# exit code meant, so name the one failure that has actually happened here.
report_failure() {
  cat "$ERR_FILE" >&2
  if grep -q 'server version mismatch' "$ERR_FILE"; then
    SERVER_MAJOR="$(sed -nE 's/.*server version: ([0-9]+).*/\1/p' "$ERR_FILE" | head -n1)"
    echo "" >&2
    echo "Every available pg_dump is older than the server. Set PG_IMAGE in this" >&2
    echo "script to a Postgres ${SERVER_MAJOR:-<server-major>} image (it is currently ${PG_IMAGE})." >&2
  fi
  cleanup_partial
  exit 1
}

HAVE_PG_DUMP=0
if command -v pg_dump >/dev/null 2>&1; then HAVE_PG_DUMP=1; fi
HAVE_DOCKER=0
if command -v docker >/dev/null 2>&1; then HAVE_DOCKER=1; fi

# The local client is tried first because it is faster and needs no daemon, but
# a failure here is not fatal while Docker can still be asked.
if [ "$HAVE_PG_DUMP" -eq 1 ] && dump_locally; then
  echo "Dumped using the local pg_dump."
elif [ "$HAVE_DOCKER" -eq 1 ]; then
  if [ "$HAVE_PG_DUMP" -eq 1 ]; then
    echo "Local pg_dump failed; retrying inside ${PG_IMAGE}. It said:" >&2
    sed -n '1,3p' "$ERR_FILE" >&2
  fi
  USED_DOCKER=1
  dump_in_docker || report_failure
  echo "Dumped using pg_dump inside ${PG_IMAGE}."
elif [ "$HAVE_PG_DUMP" -eq 1 ]; then
  # The local client failed and there is no Docker to fall back to.
  report_failure
else
  echo "ERROR: neither pg_dump nor docker is available." >&2
  exit 1
fi

# A dump that cannot be listed cannot be restored. Verifying now beats
# discovering it during an incident.
echo "Verifying dump is readable..."
if [ "$USED_DOCKER" -eq 0 ] && command -v pg_restore >/dev/null 2>&1; then
  OBJECTS="$(pg_restore --list "$OUT_FILE" | grep -cE 'TABLE|INDEX|EXTENSION' || true)"
else
  OBJECTS="$(docker run --rm -i "$PG_IMAGE" pg_restore --list < "$OUT_FILE" \
    | grep -cE 'TABLE|INDEX|EXTENSION' || true)"
fi

if [ "${OBJECTS:-0}" -lt 1 ]; then
  echo "ERROR: dump contains no recognisable objects — treat it as FAILED." >&2
  cleanup_partial
  exit 1
fi

SIZE="$(du -h "$OUT_FILE" | cut -f1)"
echo ""
echo "Backup complete: ${OUT_FILE} (${SIZE}, ${OBJECTS} objects)"
echo "A backup is only real once it has been restored — see docs/RUNBOOK.md."
