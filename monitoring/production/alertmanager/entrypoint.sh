#!/bin/sh
set -eu

: "${ALERTMANAGER_TELEGRAM_BOT_TOKEN:?Configure the Telegram bot token}"
: "${ALERTMANAGER_TELEGRAM_CHAT_ID:?Configure the Telegram destination chat ID}"
umask 077
printf '%s' "$ALERTMANAGER_TELEGRAM_BOT_TOKEN" > /tmp/apsara-telegram-bot-token
printf '%s' "$ALERTMANAGER_TELEGRAM_CHAT_ID" > /tmp/apsara-telegram-chat-id

exec /bin/alertmanager \
  --config.file=/etc/alertmanager/alertmanager.yml \
  --storage.path=/alertmanager \
  --web.listen-address="0.0.0.0:${PORT:-9093}"
