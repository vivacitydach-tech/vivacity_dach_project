# Third-party components — Target Enterprise Construction Platform

This document lists **required and optional third-party systems** from the engineering specification, what we ship in-repo, and how to run them.

> Also see: [README.md](./README.md) (docs index) · [openapi/v1.yaml](./openapi/v1.yaml) · [architecture/overview.md](./architecture/overview.md) · [../const-infra/README.md](../const-infra/README.md)

## Installed on this machine (2026-10-01)

| Package | How | Notes |
|---|---|---|
| **Python 3.12.10** | `winget install Python.Python.3.12` | `C:\Users\Zahid Iqbal\AppData\Local\Programs\Python\Python312\` |
| **OpenConstructionERP 18.2.0** | `pip install openconstructionerp` | Start: `.\scripts\start-openconstructionerp.ps1` → http://127.0.0.1:8069 — demo login `demo@openconstructionerp.com` / `DemoPass1234!` |
| **Docker Desktop 4.93.0** | `winget install Docker.DockerDesktop` | Launched; may need a **reboot** or first-run accept in the Docker Desktop UI before `docker` works. Then: `.\scripts\start-openproject-docker.ps1` |

Add Python to PATH (new terminals):
`C:\Users\Zahid Iqbal\AppData\Local\Programs\Python\Python312`
`C:\Users\Zahid Iqbal\AppData\Local\Programs\Python\Python312\Scripts`

Add Docker CLI to PATH:
`C:\Program Files\Docker\Docker\resources\bin`

## Required upstream engines (spec §2 / §4)

| Spec name | Product | License | Local ports | Status on this machine |
|---|---|---|---|---|
| **cost-core** | [OpenConstructionERP](https://github.com/datadrivenconstruction/OpenConstructionERP) (AGPL-3.0) | AGPL-3.0 | **8069** | **Local headless engine** in `cost-core/` (API-compatible stand-in). Official Docker image available when Docker is installed. |
| **pm-core** | [OpenProject](https://www.openproject.org/) Community/BIM | GPLv3 | **8080** | **Local OpenProject API v3–compatible engine** in `pm-core/`. Official `openproject/openproject` image via `const-infra` when Docker is installed. |

**Isolation rule:** browsers never call these engines. Only `const-middleware` may.

### Start local engines (no Docker)

```powershell
cd "c:\xampp\htdocs\target enterprise"
.\scripts\start-engines.ps1
```

Or:

```powershell
cd cost-core; npm run start:dev   # http://127.0.0.1:8069
cd pm-core;   npm run start:dev   # http://127.0.0.1:8080
```

Middleware `.env`:

```env
UPSTREAM_MODE=http
COST_CORE_BASE_URL=http://127.0.0.1:8069
PM_CORE_BASE_URL=http://127.0.0.1:8080
```

### Official engines (requires Docker Desktop)

```powershell
# Install Docker Desktop once (admin / reboot may be required):
winget install Docker.DockerDesktop

cd "c:\xampp\htdocs\target enterprise\const-infra"
# Stop local cost-core / pm-core first (same ports)
docker compose --profile official up -d
```

Images:

- `ghcr.io/datadrivenconstruction/openconstructionerp` → host **8069**
- `openproject/openproject` → host **8080**
- `postgres:16`, `redis:7`, `minio/minio` for supporting infra

OpenConstructionERP without Docker (optional Windows app / Python):

- Desktop installer: https://openconstructionerp.com/download  
- Or `pip install openconstructionerp` (Python 3.12+) then `openconstructionerp serve --port 8069`

## Supporting third parties

| Component | Role | How we use it today |
|---|---|---|
| **MySQL** (XAMPP) | Middleware DB | `middleware_prod` |
| **PostgreSQL 16** | Spec DB / OpenProject / OE | Via Docker profile when available |
| **Redis 7** | BullMQ queues / cache | Docker profile; middleware uses in-process sync poller until Redis is present |
| **BullMQ** | Job retries / outbox workers | `bullmq` + `@nestjs/bullmq` installed; in-process poller until Redis is up |
| **MinIO / S3** | Object storage + presigned uploads | Docker profile; middleware local disk adapter until MinIO is up |
| **ClamAV** | Upload antivirus | **Deferred** — documents module uses stub status transition only (no daemon required locally) |
| **OpenTelemetry API** | Spec §13 core metrics | `@opentelemetry/api` + in-memory counters (`api_5xx`, `provision_success`, `provision_fail`, `sync_retry`) — no collector required locally |
| **Decimal.js** | Spec §8 money/qty math | `ROUND_HALF_UP` in BOQ / EVM |
| **Cloudflare / K8s / Helm** | Edge + orchestration | Deferred (`const-infra` compose is the local substitute) |

## Application OSS (portal / middleware / mobile)

| Component | License | Use |
|---|---|---|
| NestJS | MIT | `const-middleware` |
| Next.js / React | MIT | `const-web-ui` |
| Vite / React | MIT | `const-mobile` PWA |
| Prisma | Apache-2.0 | ORM |
| Decimal.js | MIT | BOQ / EVM math |
| BullMQ | MIT | Queue / retry workers |
| OpenTelemetry API | Apache-2.0 | Lightweight metrics façade |
| Dexie.js | Apache-2.0 | Offline IndexedDB queue (mobile) |
| TanStack Query / Axios / Tailwind | MIT | Web clients |
| Passport JWT / bcryptjs / argon2 | MIT | Auth |
| Express (engines) | MIT | Local cost-core / pm-core HTTP servers |
| Node.js `node:sqlite` | — | Engine persistence |

### Spec §14 verification tests (const-middleware)

Unit tests cover scrubbing, circuit breaker (5 failures / window), BOQ decimal rounding, upstream outage → `pending_sync` / scrubbed errors, and tenant isolation (`NOT_FOUND` not `FORBIDDEN`). Run: `cd const-middleware && npm test`.

Full license texts ship with each package under `*/node_modules/*/LICENSE*`.

## Architecture (third-party placement)

```
Browser / PWA ──► const-web-ui / const-mobile
                      │
                      ▼
              const-middleware :3000/v1
                      │
        ┌─────────────┴─────────────┐
        ▼                           ▼
  cost-core :8069              pm-core :8080
  (OpenConstructionERP         (OpenProject API v3
   contract / official image)   contract / official image)
```

## Swapping stand-ins for official products

1. Stop `.\scripts\start-engines.ps1` processes.  
2. `docker compose --profile official up -d` in `const-infra`.  
3. Create OpenProject API token; set `PM_CORE_API_TOKEN` in middleware `.env`.  
4. Configure OpenConstructionERP machine token; set `COST_CORE_API_TOKEN`.  
5. Keep `UPSTREAM_MODE=http` — adapters already call these base URLs.  
6. Restart middleware; confirm `GET /v1/health` shows `cost_core_configured` / `pm_core_configured` true and engines `up`.

Target Enterprise application code in this repository is proprietary unless otherwise stated.
