# const-infra

Infrastructure as code and local stand-ins for Target Enterprise (spec §02 / §03).

## Laptop substitute

Until a real Kubernetes cluster exists, **Docker Compose is the local substitute** for K8s / Helm / Terraform. Manifests under `k8s/`, `helm/`, and `terraform/` are realistic stubs you can apply later — they are **not required** to run the platform on a developer machine.

| Layer | Local (now) | Production (later) |
|---|---|---|
| Apps + data plane | `docker-compose.yml` profiles + Node apps | `k8s/` + `helm/const-platform` |
| Cloud / DNS / WAF | document intent in `cloudflare/` | Terraform + Cloudflare |
| Observability | Compose profile `monitoring` | Prometheus / Grafana in-cluster |

## Full platform Compose (apps + data)

From the **repo root** (parent of `const-infra`), use the root `docker-compose.yml` documented in [../DOCKER.md](../DOCKER.md). That file builds middleware, portal, mobile, cost-core, pm-core plus MySQL/Redis/MinIO.

This folder’s `docker-compose.yml` remains the **upstream / monitoring** plane (`local-engines`, `official`, `monitoring` profiles).

## Compose profiles (infra only)

```bash
# Shared data plane only (redis, minio, postgres) — use with local Node engines
docker compose --profile local-engines up -d

# Official vendor images on 8069 / 8080 (stop local cost-core / pm-core first)
docker compose --profile official up -d

# Prometheus (:9090) + Grafana (:3003)
docker compose --profile monitoring up -d
```

Pinned images (no `:latest` for monitoring):

- `prom/prometheus:v2.54.1`
- `grafana/grafana:11.2.0`

## Layout

```
const-infra/
  docker-compose.yml
  k8s/                 # namespace, deployments, network policy, ingress stubs
  helm/const-platform/ # chart for middleware (extend as needed)
  terraform/           # provider stubs
  cloudflare/          # WAF / TLS intent
  monitoring/          # prometheus scrape config + Grafana notes
  runbooks/            # backup + DR
```

## Isolation rule

Only middleware may reach upstream engines (`cost-core`, `pm-core`). See `k8s/network-policy-upstream.yaml`.
