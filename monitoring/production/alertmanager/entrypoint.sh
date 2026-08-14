#!/bin/sh
set -eu

: "${ALERTMANAGER_TELEGRAM_BOT_TOKEN:?Configure the Telegram bot token}"
: "${ALERTMANAGER_TELEGRAM_CHAT_ID:?Configure the Telegram destination chat ID}"
umask 077
printf '%s' "$ALERTMANAGER_TELEGRAM_BOT_TOKEN" > /tmp/apsara-telegram-bot-token
printf '%s' "$ALERTMANAGER_TELEGRAM_CHAT_ID" > /tmp/apsara-telegram-chat-id

# The dead-man's switch. WATCHDOG_HEARTBEAT_URL points at an external service
# (healthchecks.io, Better Stack, Grafana Cloud) that pages when the always-
# firing Watchdog alert STOPS arriving. It has to be external: this container
# and the Prometheus that evaluates its rules run in the same Railway project,
# so neither can report that the pair went down together.
#
# Deliberately optional, unlike the Telegram values above. Making it required
# would mean a missing variable fails `railway up --service alertmanager`, and
# CI treats that as a failed release — an unconfigured heartbeat would block
# deploys of the application itself. Unset, the switch is simply off.
config=/etc/alertmanager/alertmanager.yml
if [ -n "${WATCHDOG_HEARTBEAT_URL:-}" ]; then
  case "$WATCHDOG_HEARTBEAT_URL" in
    http://*|https://*) ;;
    *) echo 'WATCHDOG_HEARTBEAT_URL must use http:// or https://' >&2; exit 1 ;;
  esac
  printf '%s' "$WATCHDOG_HEARTBEAT_URL" > /tmp/apsara-watchdog-url
else
  echo '[alertmanager] WATCHDOG_HEARTBEAT_URL unset — dead-man'\''s switch is OFF.' >&2
  echo '[alertmanager] Nothing will report Prometheus and Alertmanager failing together.' >&2
  sed '/# WATCHDOG-WEBHOOK-BEGIN/,/# WATCHDOG-WEBHOOK-END/d' \
    /etc/alertmanager/alertmanager.yml > /tmp/apsara-alertmanager.yml
  config=/tmp/apsara-alertmanager.yml
fi

exec /bin/alertmanager \
  --config.file="$config" \
  --storage.path=/alertmanager \
  --web.listen-address="0.0.0.0:${PORT:-9093}"
