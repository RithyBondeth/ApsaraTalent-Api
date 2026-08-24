FROM prom/prometheus:v3.14.0

USER root
COPY --chown=nobody:nobody monitoring/production/prometheus/prometheus.yml /etc/prometheus/prometheus.yml
COPY --chown=nobody:nobody monitoring/alerts.yml /etc/prometheus/alerts.yml
COPY --chown=nobody:nobody monitoring/production/prometheus/entrypoint.sh /usr/local/bin/apsara-prometheus-entrypoint
RUN chmod 0555 /usr/local/bin/apsara-prometheus-entrypoint

USER nobody
EXPOSE 9090
ENTRYPOINT ["/bin/sh", "/usr/local/bin/apsara-prometheus-entrypoint"]
