FROM grafana/grafana:13.1.3

COPY --chown=grafana:grafana monitoring/grafana/provisioning /etc/grafana/provisioning
COPY --chown=grafana:grafana monitoring/grafana/dashboards /var/lib/grafana/dashboards

USER grafana
