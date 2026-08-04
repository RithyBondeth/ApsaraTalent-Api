#!/bin/sh
set -eu

: "${METRICS_TOKEN:?METRICS_TOKEN must match every API service}"
: "${PUBLIC_API_HEALTH_URL:?Set the public API /health/ready URL}"
: "${WEB_HEALTH_URL:?Set the public web /health URL}"

case "$PUBLIC_API_HEALTH_URL" in
  http://*|https://*) ;;
  *) echo 'PUBLIC_API_HEALTH_URL must use http:// or https://' >&2; exit 1 ;;
esac
case "$WEB_HEALTH_URL" in
  http://*|https://*) ;;
  *) echo 'WEB_HEALTH_URL must use http:// or https://' >&2; exit 1 ;;
esac

umask 077
printf '%s' "$METRICS_TOKEN" > /tmp/apsara-metrics-token
public_api_health_url=$(printf '%s' "$PUBLIC_API_HEALTH_URL" | sed 's/[|&]/\\&/g')
web_health_url=$(printf '%s' "$WEB_HEALTH_URL" | sed 's/[|&]/\\&/g')
sed \
  -e "s|__PUBLIC_API_HEALTH_URL__|$public_api_health_url|g" \
  -e "s|__WEB_HEALTH_URL__|$web_health_url|g" \
  /etc/prometheus/prometheus.yml > /tmp/apsara-prometheus.yml

exec /bin/prometheus \
  --config.file=/tmp/apsara-prometheus.yml \
  --storage.tsdb.path=/prometheus \
  --storage.tsdb.retention.time="${PROMETHEUS_RETENTION:-30d}" \
  --web.listen-address="0.0.0.0:${PORT:-9090}"
