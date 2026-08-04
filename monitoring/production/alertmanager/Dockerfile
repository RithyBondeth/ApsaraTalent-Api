FROM prom/alertmanager:v0.33.1

USER root
COPY --chown=nobody:nobody monitoring/production/alertmanager/alertmanager.yml /etc/alertmanager/alertmanager.yml
COPY --chown=nobody:nobody monitoring/production/alertmanager/entrypoint.sh /usr/local/bin/apsara-alertmanager-entrypoint
RUN chmod 0555 /usr/local/bin/apsara-alertmanager-entrypoint

USER nobody
EXPOSE 9093
ENTRYPOINT ["/bin/sh", "/usr/local/bin/apsara-alertmanager-entrypoint"]
