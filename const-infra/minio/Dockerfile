FROM alpine:3.20
RUN apk add --no-cache ca-certificates curl \
  && curl -fsSL "https://github.com/minio/minio/releases/latest/download/minio" -o /usr/local/bin/minio \
  && chmod +x /usr/local/bin/minio \
  && adduser -D -u 1000 minio \
  && mkdir -p /data \
  && chown -R minio:minio /data
USER minio
VOLUME ["/data"]
EXPOSE 9000 9001
ENTRYPOINT ["/usr/local/bin/minio"]
CMD ["server", "/data", "--console-address", ":9001"]
