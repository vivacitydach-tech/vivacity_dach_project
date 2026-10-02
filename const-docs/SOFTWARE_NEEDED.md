# Software required by the Engineering Spec (v1.0.0)

Mapped 1:1 from `construction_platform_engineering_spec.html` (Sections 01–15).

## A. Application repositories (spec §2)

| Spec repo | Software | Status in this workspace |
|---|---|---|
| **const-middleware** | NestJS 10+, TypeScript 5, Prisma, JWT, BullMQ workers | ✅ `const-middleware/` |
| **const-web-ui** | Next.js 14+, React, Tailwind, TanStack Query | ✅ `const-web-ui/` |
| **const-mobile** | Offline-first PWA (Vite/React, Dexie IndexedDB) | ✅ `const-mobile/` |
| **const-infra** | Docker Compose (local stand-in for K8s/Helm/Terraform) + monitoring profile | ✅ `const-infra/` (compose, k8s/, helm/, terraform/, monitoring/) |
| **const-docs** | OpenAPI 3.1 + architecture + THIRD_PARTY attribution | ✅ `const-docs/` (openapi/v1.yaml, architecture/) |

## B. Upstream engines (spec §3 / §4) — private only

| Spec DNS | Product | Port | How to run | Status |
|---|---|---|---|---|
| `cost-core.internal:8069` | **OpenConstructionERP** | **8069** | `.\scripts\start-openconstructionerp.ps1` (pip) or Docker official image | ✅ Python package installed; start script ready |
| `pm-core.internal:8080` | **OpenProject Community/BIM** | **8080** | Docker `openproject/openproject` via compose profile `official` | ⏳ Needs Docker engine running |
| Local stand-ins | Node `cost-core/` + `pm-core/` | 8069 / 8080 | `.\scripts\start-engines.ps1` | ✅ Available when official engines are down |

## C. Data plane (spec §3 / §5 / §6)

| Spec component | Software | Status |
|---|---|---|
| Primary DB | **PostgreSQL 16** (`middleware_prod`, uuid-ossp, pgcrypto, NUMERIC) | ⏳ Docker compose service `postgres` (middleware currently uses XAMPP MySQL for local MVP) |
| Queues / sessions | **Redis 7** (+ BullMQ) | ⏳ Docker compose service `redis` |
| Object storage | **MinIO / S3** (presigned PUT/GET) | ⏳ Docker compose service `minio` |
| Cost-core DB | Isolated Postgres `cost_core_db` | Embedded in OpenConstructionERP (pip) / Docker volume |
| PM-core DB | Isolated Postgres `pm_core_db` | Inside OpenProject Docker stack |

## D. Middleware stack (spec §5 / §7 / §8)

| Spec | Software | Status |
|---|---|---|
| Language | TypeScript 5.x | ✅ |
| Framework | NestJS modular monolith | ✅ |
| ORM | Prisma | ✅ |
| Auth crypto | Argon2id + JWT 15m | ⚠️ JWT ✅; hashing currently bcryptjs (Argon2id can be swapped) |
| Queues | BullMQ + Redis 7 | ⚠️ Packages installed; in-process sync poller until Redis is up |
| API contract | OpenAPI 3.1 / `/v1` envelopes | ✅ envelopes; OpenAPI export stub in docs |
| Observability (§13) | Log scrubbing + OTel API metrics | ✅ `scrub.ts` + in-memory `api_5xx` / provision / sync_retry |
| Testing (§14) | Jest + Supertest | ✅ scrub, circuit breaker, decimal, outage, tenant isolation |
| Ports / circuit breaker | CostCorePort, PmCorePort | ✅ mock + HTTP adapters |

## E. Edge / production infra (spec §3 / §12 / §13) — not required for local laptop

| Spec | Software | Local approach |
|---|---|---|
| Cloudflare WAF / TLS 1.3 | Cloudflare | Deferred (prod) |
| Kubernetes + Ingress-Nginx | K8s / Helm | Deferred; Docker Compose local |
| Terraform | IaC | Deferred |
| Prometheus / Grafana | Observability | Deferred collector; local OTel API + in-memory counters ✅ |
| HashiCorp Vault / Sealed Secrets | Secrets | `.env` local only |
| ClamAV | Upload AV | Deferred stub (no local daemon) |

## F. Host prerequisites (your PC)

| Tool | Purpose | Status |
|---|---|---|
| **Node.js 20+** | Nest / Next / PWA / local engines | ✅ |
| **Python 3.12** | OpenConstructionERP | ✅ installed |
| **Docker Desktop** | Postgres, Redis, MinIO, OpenProject | ✅ installed — **start the whale / finish first-run so engine is Running** |
| **XAMPP MySQL** | Current middleware DB | ✅ `middleware_prod` |
| Git | Repos | Optional |

## H. Spec §8–§12 packages (from your latest screenshots)

| Spec item | Package / tool | Status |
|---|---|---|
| CostCorePort / PmCorePort | TypeScript ports + HTTP adapters | ✅ |
| Circuit breaker 5/60s + outbox | `CircuitBreaker` + `sync_jobs` | ✅ |
| BullMQ retries 5s…30m | `bullmq` + `@nestjs/bullmq` + `ioredis` | ✅ installed (needs Redis container) |
| Decimal.js ROUND_HALF_UP | `decimal.js` | ✅ (+ `boq.decimal.spec.ts`) |
| Argon2id + JWT 15m | `argon2` + `@nestjs/jwt` | ✅ (seed/login use Argon2id) |
| `/v1` success/error envelopes | Nest interceptor + filter | ✅ `request_id` in `error` + `meta` |
| Log scrubbing (§13) | `scrubForLog` / client sanitize | ✅ password/token/cookie + amqp/postgres/*.internal |
| OpenTelemetry core metrics | `@opentelemetry/api` | ✅ lightweight in-memory counters |
| OpenProject + BCF sync | pm-core adapter | ✅ stand-in / Docker OpenProject when engine up |
| S3 presign + SHA-256 complete | documents module + MinIO | ⚠️ local disk now; MinIO via Docker |
| ClamAV antivirus scan | — | ⏳ deferred stub |
| WebSocket provisioning events | `@nestjs/websockets` + socket.io | ✅ packages installed |
| next-intl EN/DE | `next-intl` | ✅ installed on web-ui |
| Dexie IndexedDB offline queue | `dexie` | ✅ const-mobile |
| Jest §14 suite | scrub / breaker / outage / tenancy | ✅ `npm test` |
| ESLint + Prettier + TS strict | both apps | ✅ |
| Trivy / SonarQube / Cosign / Helm / ArgoCD | CI/CD prod | ⏳ deferred (need Docker/K8s) |

### Definition of Done (local MVP checklist)

| Item | Status |
|---|---|
| Middleware builds (`npm run build`) | ✅ |
| §14 unit tests pass (`npm test`) | ✅ scrub, decimal, circuit breaker, outage, tenant isolation |
| Error envelope never leaks stack / SQL / upstream product names | ✅ HttpExceptionFilter |
| Core metrics recordable without collector | ✅ `src/common/telemetry/metrics.ts` |
| ClamAV | ⏳ deferred |
| Full e2e against live Postgres/Redis | ⏳ when Docker data plane is up |

## G. Start order (local, matching the architecture diagram)

```powershell
# 1) Docker Desktop must show "Engine running"
# 2) Support data plane
cd "c:\xampp\htdocs\target enterprise\const-infra"
docker compose --profile local-engines up -d   # postgres + redis + minio

# 3) Upstream cost-core (OpenConstructionERP) — stop Node stand-in on :8069 first
..\scripts\start-openconstructionerp.ps1

# 4) Upstream pm-core — either official OpenProject OR local stand-in
# Official (stops local pm-core on :8080):
..\scripts\start-openproject-docker.ps1
# OR stand-in:
..\scripts\start-engines.ps1

# 5) Apps
cd ..\const-middleware; npm run start:dev   # :3000/v1
cd ..\const-web-ui; npm run dev -- -p 3001
cd ..\const-mobile; npm run dev -- --port 3002
```

Public surface only (spec rule): **app :3001**, **api :3000/v1**, **field PWA :3002**.  
Never expose cost-core / pm-core / Postgres / Redis to the public internet.
