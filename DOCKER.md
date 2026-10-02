# Target Enterprise — Docker

Run the full platform (API, portal, field PWA, MySQL, Redis, MinIO, cost-core, pm-core) with Docker Compose.

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (Windows/Mac) or Docker Engine + Compose plugin (Linux VPS)
- Free ports: **3000, 3001, 3002, 3307, 6379, 8069, 8080, 9000, 9001**
- Stop local Nest/Next/XAMPP apps that use those ports first

## Quick start (laptop)

From the repo root (`target enterprise`):

```powershell
copy .env.docker.example .env.docker
docker compose --env-file .env.docker up -d --build
```

Or:

```powershell
.\scripts\docker-up.ps1
```

Open:

| Service | URL |
|---------|-----|
| Portal | http://localhost:3001 |
| API | http://localhost:3000/v1/health |
| Field PWA | http://localhost:3002 |
| MinIO console | http://localhost:9001 |

Login (after seed): `admin@target.local` / `Password123!`

## Optional Nginx gateway (single port 80)

```powershell
docker compose --env-file .env.docker --profile gateway up -d --build
```

Then: http://localhost/ (portal), http://localhost/v1/ (API), http://localhost/field/ (PWA)

## VPS deploy

1. Install Docker on Ubuntu VPS (`curl -fsSL https://get.docker.com | sh`)
2. Upload / `git clone` this repo
3. Edit `.env.docker`:
   - Strong `JWT_SECRET`, `MYSQL_PASSWORD`
   - `NEXT_PUBLIC_API_URL=https://api.yourdomain.com/v1`
   - `VITE_API_URL=https://api.yourdomain.com/v1`
   - `CORS_ORIGIN=https://app.yourdomain.com,https://field.yourdomain.com`
4. Rebuild web/mobile after URL changes (`--build`)
5. `docker compose --env-file .env.docker up -d --build`
6. Put a host Nginx/Caddy + SSL in front of ports 3000/3001/3002 (or use `--profile gateway` behind SSL terminator)

## Useful commands

```powershell
docker compose --env-file .env.docker ps
docker compose --env-file .env.docker logs -f api
docker compose --env-file .env.docker down
docker compose --env-file .env.docker down -v   # wipe volumes (DB too)
```

## Architecture

```text
Browser → web:3001 / mobile:3002
              ↓
           api:3000  →  mysql / redis / minio
              ↓
     cost-core:8069 + pm-core:8080  (private to compose network)
```

Official OpenProject / OpenConstructionERP images remain under `const-infra/docker-compose.yml` (`--profile official`).
