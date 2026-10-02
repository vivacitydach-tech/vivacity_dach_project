# Grafana dashboard provisioning notes

## Local (Docker Compose profile `monitoring`)

```bash
cd const-infra
docker compose --profile monitoring up -d
```

| Service | Image (pinned) | Host port |
|---|---|---|
| Prometheus | `prom/prometheus:v2.54.1` | http://localhost:9090 |
| Grafana | `grafana/grafana:11.2.0` | http://localhost:3003 |

Grafana default login: `admin` / `admin` (change on first login).

Port **3003** avoids clashing with Next.js on **3001**.

### Datasource (manual first pass)

1. Open Grafana → Connections → Data sources → Add Prometheus
2. URL: `http://prometheus:9090` (compose network) or `http://localhost:9090` if browsing from host with port mapping only
3. Save & test

### File-based provisioning (later)

Mount a provisioning tree, e.g.:

```
monitoring/grafana/
  provisioning/
    datasources/datasource.yml
    dashboards/dashboards.yml
  dashboards/
    platform-overview.json
```

Wire in compose:

```yaml
volumes:
  - ./monitoring/grafana/provisioning:/etc/grafana/provisioning:ro
  - ./monitoring/grafana/dashboards:/var/lib/grafana/dashboards:ro
```

### Suggested panels (when `/metrics` exists)

- Middleware request rate / latency / error ratio
- Upstream cost-core / pm-core up/down (from health adapter metrics)
- Redis / Postgres / MinIO availability

Until Nest exports Prometheus metrics, use Grafana HTTP or synthetic checks against `/v1/health`.
