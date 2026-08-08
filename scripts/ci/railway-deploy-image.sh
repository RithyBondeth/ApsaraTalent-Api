#!/usr/bin/env bash
#
# Deploy one Railway service from a prebuilt GHCR image, and wait until it is
# actually healthy.
#
# The waiting is the entire reason this file exists. `railway up` in CI mode
# streams the build and fails the step when a service does not become active —
# a health guarantee the release depends on. The image path does not:
#
#   railway service source connect --image ...   returns in ~4s (config only)
#   railway redeploy --from-source --yes         returns in ~3.7s (fire and forget)
#
# Measured on 2026-08-08. Swapping to those two commands alone would have made
# every release report success the moment Railway *accepted* the deploy rather
# than when the service was serving — losing per-service verification while
# looking like an improvement in the diff. So this polls the deployment to
# SUCCESS itself.
#
# Usage:  scripts/ci/railway-deploy-image.sh "Auth Service" ghcr.io/owner/img:sha
# Env:    RAILWAY_UP_ATTEMPTS      transient retries per command (default 3)
#         RAILWAY_DEPLOY_TIMEOUT   seconds to reach SUCCESS (default 600)

set -uo pipefail

service="${1:?usage: railway-deploy-image.sh <service name> <image>}"
image="${2:?usage: railway-deploy-image.sh <service name> <image>}"
attempts="${RAILWAY_UP_ATTEMPTS:-3}"
deploy_timeout="${RAILWAY_DEPLOY_TIMEOUT:-600}"

# Transport failures say nothing about whether the deploy is valid, so they are
# retried; anything else is surfaced immediately. Same policy as railway-up.sh.
TRANSIENT='operation timed out|reqwest error|error sending request|connection (reset|refused|closed|error)|tcp connect error|dns error|handshake|EOF while parsing|502 Bad Gateway|503 Service|504 Gateway|temporarily unavailable'

log="$(mktemp)"
trap 'rm -f "$log"' EXIT

# Runs a railway command, retrying only transport failures.
run_with_retry() {
  local what="$1"; shift
  for attempt in $(seq 1 "$attempts"); do
    if "$@" >"$log" 2>&1; then
      cat "$log"
      return 0
    fi
    cat "$log"
    if ! grep -qiE "$TRANSIENT" "$log"; then
      echo "::error::${what} for ${service} failed, and the error is not transient — not retrying."
      return 1
    fi
    if [[ "$attempt" -eq "$attempts" ]]; then
      echo "::error::${what} for ${service} failed ${attempts} times with transport errors. Check https://status.railway.com"
      return 1
    fi
    local backoff=$((10 * (2 ** (attempt - 1))))
    echo "Transient failure during ${what} for ${service}; retrying in ${backoff}s."
    sleep "$backoff"
  done
}

# Prints "<id> <status>" for the newest deployment, or nothing.
newest_deployment() {
  railway deployment list --service "$service" --json 2>/dev/null | node -e '
    let s="";
    process.stdin.on("data", (d) => (s += d)).on("end", () => {
      try {
        const parsed = JSON.parse(s);
        const list = Array.isArray(parsed) ? parsed : parsed.deployments || [];
        const newest = (list[0] || {}).node || list[0];
        if (newest && newest.id) console.log(`${newest.id} ${newest.status}`);
      } catch { /* transient CLI/API hiccup — the caller keeps polling */ }
    });
  '
}

read -r baseline_id _ < <(newest_deployment)
echo "Deploying ${service} from ${image}"
echo "  current deployment: ${baseline_id:-none}"

run_with_retry "Pointing the service at the image" \
  railway service source connect --image "$image" --service "$service" || exit 1

run_with_retry "Triggering the deploy" \
  railway redeploy --service "$service" --from-source --yes || exit 1

# --------------------------------------------------------------- wait --------
echo "  waiting for a new deployment to become active (timeout ${deploy_timeout}s)..."
deadline=$(( SECONDS + deploy_timeout ))
last_status=""

while [[ "$SECONDS" -lt "$deadline" ]]; do
  read -r id status < <(newest_deployment)

  # No new deployment yet, or the API blipped. Keep waiting.
  if [[ -z "${id:-}" || "$id" == "$baseline_id" ]]; then
    sleep 10
    continue
  fi

  if [[ "$status" != "$last_status" ]]; then
    echo "    ${status}"
    last_status="$status"
  fi

  case "$status" in
    SUCCESS)
      echo "  ${service} is active (${id})"
      exit 0
      ;;
    FAILED|CRASHED|REMOVED)
      # REMOVED here means the new deployment was superseded or torn down before
      # becoming active — not a healthy rollout.
      echo "::error::${service} deployment ${id} ended as ${status}. It is NOT serving the new image."
      exit 1
      ;;
  esac

  sleep 10
done

echo "::error::${service} did not become active within ${deploy_timeout}s (last status: ${last_status:-unknown}). Production may be part-way through a release."
exit 1
