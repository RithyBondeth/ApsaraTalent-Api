FROM grafana/grafana:13.2.0

COPY --chown=grafana:grafana monitoring/grafana/provisioning /etc/grafana/provisioning
# NOT /var/lib/grafana/dashboards. Railway mounts the Grafana volume at
# /var/lib/grafana, which shadows everything the image put there — so dashboards
# copied to that path vanish at runtime and Grafana logs "failed to walk
# provisioned dashboards" every 30s, forever, with no dashboard ever appearing.
# /etc/grafana is not a mount point, so content there survives.
COPY --chown=grafana:grafana monitoring/grafana/dashboards /etc/grafana/dashboards

USER grafana
