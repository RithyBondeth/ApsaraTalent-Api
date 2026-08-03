FROM prom/blackbox-exporter:v0.28.0

COPY --chown=nobody:nobody monitoring/blackbox.yml /etc/blackbox/blackbox.yml

USER nobody
EXPOSE 9115
ENTRYPOINT ["/bin/blackbox_exporter"]
CMD ["--config.file=/etc/blackbox/blackbox.yml", "--web.listen-address=0.0.0.0:9115"]
