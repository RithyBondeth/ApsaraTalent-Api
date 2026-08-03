#!/bin/sh
set -eu

: "${ALERTMANAGER_SLACK_WEBHOOK_URL:?Configure an operations Slack webhook}"
umask 077
printf '%s' "$ALERTMANAGER_SLACK_WEBHOOK_URL" > /tmp/apsara-slack-webhook

exec /bin/alertmanager \
  --config.file=/etc/alertmanager/alertmanager.yml \
  --storage.path=/alertmanager \
  --web.listen-address="0.0.0.0:${PORT:-9093}"
