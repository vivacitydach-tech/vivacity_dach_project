# const-mobile — Target Enterprise Field

Offline-first field PWA for site diary, snag/defect reporting, camera capture, and signatures.

## Stack

- Vite + React + TypeScript + Tailwind CSS v4
- Dexie.js (IndexedDB) offline queue
- `vite-plugin-pwa` installable shell
- Port **3002**

## Setup

```bash
cd "const-mobile"
npm install
npm run dev
```

Open http://localhost:3002

### Env (`.env`)

```env
VITE_API_URL=http://localhost:3000/v1
VITE_COMPANY_ID=00000000-0000-4000-8000-000000000001
```

Middleware must be running (`const-middleware` on :3000). Seed login:

- `site@target.local` / `Password123!`

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Dev server on http://localhost:3002 |
| `npm run build` | Production build |
| `npm run preview` | Preview production build on :3002 |

## Routes / screens

| Path | Screen |
|---|---|
| `/login` | Login |
| `/projects` | Project picker (`GET /projects`) |
| `/projects/:id` | Project home |
| `/projects/:id/diary` | Site diary + signature pad |
| `/projects/:id/snags` | Snag/defect create + list |
| `/projects/:id/camera` | Camera capture (`capture="environment"`) |
| `/projects/:id/queue` | Offline queue inspector / manual sync |

## Sync behavior

- All create ops are written to Dexie first with a UUID **Idempotency-Key**.
- When online (or on “Sync now”), the queue replays:
  - **Diary** → documents `presign` + `complete` as `report` JSON (signature as extra `other` doc)
  - **Snag** → `POST /projects/:id/issues` with `type: defect`
  - **Photo** → blob from IndexedDB → documents `presign` + `complete` as `photo`
- Conflict rules: **server wins for issue status** on reconcile; diary/photos are **append-only**; retries reuse the same `Idempotency-Key`.
