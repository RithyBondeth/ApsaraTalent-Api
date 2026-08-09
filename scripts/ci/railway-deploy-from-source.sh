#!/usr/bin/env bash
#
# Deploy one Railway service from its configured source, and wait for that
# deployment to actually become healthy.
#
# For a service whose source is a registry image, this pulls whatever the tag
# now points at — which is how build-once-deploy-many works here: the
# `containers` job builds the image, scans it, pushes it as both :<sha> and
# :main, and this step tells Railway to take it. No rebuild.
#
# WHY NOT `railway up`
#
# `railway up` uploads the working directory and has Railway build it, so the
# artifact that runs is a rebuild of the source rather than the image that was
# scanned. It also costs ~1.5-3.8 minutes per service; the whole deploy job was
# 17 minutes, 63% of a release, rebuilding 11 images the containers job had
# already built in parallel in 2.5.
#
# WHY `--from-source` IS LOAD-BEARING
#
# Bare `railway redeploy` re-runs the EXISTING deployment — it would redeploy
# the old image and report success, shipping nothing. `--from-source` is
# documented as "pull and deploy the latest commit or image from the configured
# source", and that difference was measured: the first digest-probe run moved a
# service's source and got the previous image back, because it used the redeploy
# operation rather than the deploy one.
#
# WHY THE WAIT
#
# `railway redeploy` returns as soon as Railway accepts the request (~3.7s,
# measured 2026-08-08). `railway up` in attached mode blocks until the service
# is active, and every release depends on that guarantee — without polling here
# a release would report success the moment the request was accepted, and
# verify-deployment.mjs would run against the previous revision.
#
# RETRIES are transport-shaped only, same policy and same reasoning as
# railway-up.sh: a failed deploy fails the same way three times, and retrying it
# just buries the real error.
#
# Usage:  scripts/ci/railway-deploy-from-source.sh "Notification Service"
# Env:    RAILWAY_DEPLOY_ATTEMPTS  (default 3)
#         RAILWAY_DEPLOY_TIMEOUT   seconds to wait for SUCCESS (default 600)

set -uo pipefail

service="${1:?usage: railway-deploy-from-source.sh <service name>}"
attempts="${RAILWAY_DEPLOY_ATTEMPTS:-3}"
timeout="${RAILWAY_DEPLOY_TIMEOUT:-600}"

TRANSIENT='operation timed out|reqwest error|error sending request|connection (reset|refused|closed|error)|tcp connect error|dns error|handshake|EOF while parsing|502 Bad Gateway|503 Service|504 Gateway|temporarily unavailable'

log="$(mktemp)"
trap 'rm -f "$log"' EXIT

# The id of the deployment that is serving right now. The new one is whatever
# appears that is not this, which is what makes the wait below able to tell a
# fresh rollout from the previous revision still answering.
current_deployment() {
  railway deployment list --service "$service" --limit 1 --json 2>/dev/null \
    | sed -n '/^[[{]/,$p' \
    | node -e "
      let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{
        try {
          const j = JSON.parse(s);
          const list = Array.isArray(j) ? j : (j.deployments || j.data || []);
          process.stdout.write(list[0]?.id || '');
        } catch { process.stdout.write(''); }
      });"
}

# Prints "<id> <status>" for the newest deployment.
latest_deployment() {
  railway deployment list --service "$service" --limit 1 --json 2>/dev/null \
    | sed -n '/^[[{]/,$p' \
    | node -e "
      let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{
        try {
          const j = JSON.parse(s);
          const list = Array.isArray(j) ? j : (j.deployments || j.data || []);
          const d = list[0];
          process.stdout.write(d ? \`\${d.id} \${d.status}\` : '');
        } catch { process.stdout.write(''); }
      });"
}

previous="$(current_deployment)"
echo "Deploying ${service} from its configured source (was ${previous:-none})."

deployed=0
for attempt in $(seq 1 "$attempts"); do
  if [[ "$attempt" -gt 1 ]]; then
    echo "::notice::Retrying deploy of ${service} (attempt ${attempt}/${attempts})"
  fi

  railway redeploy --service "$service" --from-source --yes 2>&1 | tee "$log"
  status="${PIPESTATUS[0]}"

  if [[ "$status" -eq 0 ]]; then
    deployed=1
    break
  fi

  if ! grep -qiE "$TRANSIENT" "$log"; then
    echo "::error::Deploying ${service} failed (exit ${status}) and the error is not transient — not retrying."
    exit "$status"
  fi

  if [[ "$attempt" -eq "$attempts" ]]; then
    echo "::error::Deploying ${service} failed ${attempts} times with transport errors. Check https://status.railway.com before re-running."
    exit "$status"
  fi

  backoff=$((10 * (2 ** (attempt - 1))))
  echo "Transient failure deploying ${service}; retrying in ${backoff}s."
  sleep "$backoff"
done

[[ "$deployed" -eq 1 ]] || exit 1

echo "Request accepted. Waiting for ${service} to become active..."

deadline=$(( $(date +%s) + timeout ))
last_status=""
while [[ "$(date +%s)" -lt "$deadline" ]]; do
  read -r id state <<<"$(latest_deployment)"

  if [[ -n "${id:-}" && "$id" != "$previous" ]]; then
    case "$state" in
      SUCCESS)
        echo "${service} is active on ${id}."
        exit 0
        ;;
      FAILED|CRASHED)
        echo "::error::${service} deployment ${id} ended ${state}. Logs: railway logs --service \"${service}\""
        exit 1
        ;;
      *)
        if [[ "$state" != "$last_status" ]]; then
          echo "  ${state}..."
          last_status="$state"
        fi
        ;;
    esac
  fi

  sleep 5
done

echo "::error::${service} did not reach SUCCESS within ${timeout}s (last status: ${last_status:-unknown})."
exit 1
