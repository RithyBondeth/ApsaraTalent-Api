#!/usr/bin/env bash
#
# Deploy one Railway service, retrying only when the failure looks like the
# network rather than the build.
#
# A release is eleven sequential `railway up` calls. Before this wrapper, any
# one of them failing ended the release wherever it happened to be: on
# 2026-08-07 a Railway API timeout ("reqwest error / operation timed out")
# aborted after four of seven application services, leaving the gateway on the
# previous revision and skipping verification entirely. The deploy itself was
# fine — the same step succeeded on retry with no changes.
#
# That is the failure mode worth engineering against, because it produces mixed
# revisions unattended, and mixed revisions over TCP RPC are their own outage
# (docs/RUNBOOK.md §4).
#
# Retries are deliberately NOT blanket. A failed build fails the same way three
# times; retrying it just burns ten minutes and buries the real error. Only
# transport-shaped failures are retried.
#
# Retained as the fallback for the image-based deploy path: reverting
# deploy.yml to call this restores the previous behaviour without needing GHCR.
#
# Usage:  scripts/ci/railway-up.sh "Auth Service"
# Env:    RAILWAY_UP_ATTEMPTS (default 3)

set -uo pipefail

service="${1:?usage: railway-up.sh <service name>}"
attempts="${RAILWAY_UP_ATTEMPTS:-3}"

# Transport failures: the request never reached Railway, or the stream to it
# died. None of these say anything about whether the code builds.
TRANSIENT='operation timed out|reqwest error|error sending request|connection (reset|refused|closed|error)|tcp connect error|dns error|handshake|EOF while parsing|502 Bad Gateway|503 Service|504 Gateway|temporarily unavailable'

log="$(mktemp)"
trap 'rm -f "$log"' EXIT

for attempt in $(seq 1 "$attempts"); do
  if [[ "$attempt" -gt 1 ]]; then
    echo "::notice::Retrying deploy of ${service} (attempt ${attempt}/${attempts})"
  fi

  # tee keeps Railway's build output streaming into the job log in real time
  # while still capturing it for the pattern check below.
  railway up --service "$service" 2>&1 | tee "$log"
  status="${PIPESTATUS[0]}"

  if [[ "$status" -eq 0 ]]; then
    [[ "$attempt" -gt 1 ]] && echo "::notice::${service} deployed on attempt ${attempt}."
    exit 0
  fi

  if ! grep -qiE "$TRANSIENT" "$log"; then
    echo "::error::Deploying ${service} failed (exit ${status}) and the error is not transient — not retrying."
    exit "$status"
  fi

  if [[ "$attempt" -eq "$attempts" ]]; then
    echo "::error::Deploying ${service} failed ${attempts} times with transport errors. Railway may be degraded — check https://status.railway.com before re-running."
    exit "$status"
  fi

  # 10s, 20s, 40s. Long enough for a blip to clear, short enough that a real
  # outage is obvious quickly.
  backoff=$((10 * (2 ** (attempt - 1))))
  echo "Transient failure deploying ${service}; retrying in ${backoff}s."
  sleep "$backoff"
done
