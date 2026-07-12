# OrbitLab — PocketBase cloud hosting

Production guide for running OrbitLab’s PocketBase backend as a **single binary** with a **persistent volume** for `pb_data`.

Local install, schema import, and Docker Compose: see **[../README.md](../README.md)**.

Official reference: [Going to production](https://pocketbase.io/docs/going-to-production/). Fly walkthrough: [Host on Fly.io](https://github.com/pocketbase/pocketbase/discussions/537).

---

## Goals (OrbitLab)

| Concern | Production choice |
|---------|-------------------|
| Runtime | One PocketBase process (SQLite — **do not** scale to multiple writers) |
| Data | Persistent volume mounted over `pb_data` (SQLite + file storage) |
| TLS | Terminated by the host (Render / Fly); PB listens on plain HTTP inside |
| Health | `GET /api/health` |
| CORS | Restrict to Netlify + local Vite (see below) |
| Superuser | Prefer **CLI** (`superuser upsert`) against the mounted data dir — not only the browser installer |
| Schema | Import `pb_schema.json` from CI/local with superuser credentials ([README](../README.md)) |

**Pinned binary version (local scripts):** `0.25.8` — keep cloud images on the same pin unless you deliberately upgrade.

---

## Architecture (all hosts)

```
Browser (Netlify SPA / Vite)
        │  HTTPS
        ▼
  Host reverse proxy (Render / Fly)
        │  HTTP  →  0.0.0.0:PORT
        ▼
  pocketbase serve --dir=<volume>/pb_data
        │
        ▼
  [volume]  SQLite (data.db) + storage/
```

### Hard requirements

1. **Single instance** — PocketBase uses embedded SQLite. One machine with one volume. No horizontal scale-out for writers.
2. **Persistent disk** — Without a volume, every deploy wipes Auth, collections, and uploads.
3. **Bind `0.0.0.0`** — Cloud proxies cannot reach `127.0.0.1` inside the container.
4. **Health check** — Path: `/api/health` (JSON OK when the process is up).

### Ports

| Host | Internal listen | Notes |
|------|-----------------|--------|
| **Render** | `0.0.0.0:$PORT` | Render injects `PORT` (often `10000`). Always use `$PORT`. |
| **Fly.io** | `0.0.0.0:8080` | Match `internal_port` in `fly.toml` (example below uses `8080`). |
| Local | `127.0.0.1:8090` | See [../README.md](../README.md) |

### Health check

```http
GET /api/health
```

Expect HTTP **200**. Use this path for Render `healthCheckPath` and Fly HTTP checks.

### CORS (required for the Netlify SPA)

PocketBase defaults to allowing all origins. For production, pass an explicit list with `--origins` (comma-separated):

| Origin | Why |
|--------|-----|
| `https://stirring-figolla-e187f5.netlify.app` | Live OrbitLab web demo |
| `http://localhost:5173` | Vite dev |
| `http://127.0.0.1:5173` | Vite dev (loopback alternate) |

Example serve flags:

```bash
./pocketbase serve \
  --http=0.0.0.0:${PORT:-8080} \
  --dir=/pb/pb_data \
  --origins=https://stirring-figolla-e187f5.netlify.app,http://localhost:5173,http://127.0.0.1:5173
```

Add a custom domain later by appending it to `--origins` and redeploying.

### Superuser (prefer CLI)

Browser installer works but is awkward on ephemeral machines (token URLs in logs, first-visit only). Prefer CLI against the **same** data directory the server uses:

```bash
# Upsert is idempotent — safe on every deploy start if you want
./pocketbase superuser upsert "$PB_ADMIN_EMAIL" "$PB_ADMIN_PASSWORD" --dir=/pb/pb_data
```

| Host | How to run CLI |
|------|----------------|
| **Render** | Shell / one-off job on the service, **or** prefix the start command (see [render-blueprint.md](./render-blueprint.md)) |
| **Fly.io** | `fly ssh console -C '...'` after the volume is mounted |

Never put `PB_ADMIN_PASSWORD` in the frontend or in `VITE_*` vars.

### Web app wiring (after PB is live)

On Netlify (build-time):

```bash
VITE_DATA_BACKEND=pocketbase
VITE_POCKETBASE_URL=https://YOUR-PB-HOST   # e.g. https://orbitlab-pb.onrender.com
```

Redeploy the SPA so Vite inlines the URL. Full static deploy notes: monorepo [`docs/DEPLOY.md`](../../../docs/DEPLOY.md).

---

## Environment variables

No real secrets in this file. Set values in the host dashboard / secrets store.

### PocketBase process / ops

| Variable | Required | Example / notes |
|----------|----------|-----------------|
| `PORT` | Render: yes (injected) | Listen with `--http=0.0.0.0:$PORT` |
| `PB_ADMIN_EMAIL` | Recommended | Superuser email for upsert + schema import |
| `PB_ADMIN_PASSWORD` | Recommended | Strong secret; host env only |
| `PB_DATA_DIR` | Optional | Default in images: `/pb/pb_data` (must match volume mount) |
| `PB_ORIGINS` | Recommended | Comma-separated CORS origins (see above) |
| `PB_VERSION` | Build-time | e.g. `0.25.8` (Docker `ARG`) |
| `PB_ENCRYPTION_KEY` | Optional | 32-char random string; start with `--encryptionEnv=PB_ENCRYPTION_KEY` to encrypt settings in DB |
| `GOMEMLIMIT` | Optional | e.g. `384MiB` on small VMs to reduce OOM kills |

### Schema import (from your laptop / CI — not required on the server)

| Variable | Example |
|----------|---------|
| `POCKETBASE_URL` | `https://YOUR-PB-HOST` |
| `PB_ADMIN_EMAIL` | same superuser |
| `PB_ADMIN_PASSWORD` | same secret |
| `PB_DELETE_MISSING` | `true` only for destructive collection sync |

### Web (Netlify / Vite — never admin secrets)

| Variable | Example |
|----------|---------|
| `VITE_DATA_BACKEND` | `pocketbase` |
| `VITE_POCKETBASE_URL` | `https://YOUR-PB-HOST` |

---

## Dockerfile (shared pattern)

PocketBase has no official image. Minimal production image (linux amd64):

```dockerfile
FROM alpine:latest

ARG PB_VERSION=0.25.8

RUN apk add --no-cache unzip ca-certificates

ADD https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_linux_amd64.zip /tmp/pb.zip
RUN unzip /tmp/pb.zip -d /pb/ \
  && chmod +x /pb/pocketbase \
  && rm /tmp/pb.zip

# Data lives on the volume, not in the image
EXPOSE 8080

# Default for Fly; Render overrides with dockerCommand / start using $PORT
CMD ["/pb/pocketbase", "serve", "--http=0.0.0.0:8080", "--dir=/pb/pb_data"]
```

Persist data by mounting a volume at **`/pb/pb_data`**.

Optional entrypoint that upserts superuser then serves (secrets from env):

```sh
#!/bin/sh
set -eu
DIR="${PB_DATA_DIR:-/pb/pb_data}"
HTTP="${PB_HTTP:-0.0.0.0:${PORT:-8080}}"
ORIGINS="${PB_ORIGINS:-https://stirring-figolla-e187f5.netlify.app,http://localhost:5173,http://127.0.0.1:5173}"

if [ -n "${PB_ADMIN_EMAIL:-}" ] && [ -n "${PB_ADMIN_PASSWORD:-}" ]; then
  /pb/pocketbase superuser upsert "$PB_ADMIN_EMAIL" "$PB_ADMIN_PASSWORD" --dir="$DIR"
fi

exec /pb/pocketbase serve --http="$HTTP" --dir="$DIR" --origins="$ORIGINS"
```

---

## Render.com

**Disks are not available on the free web tier.** Use a paid instance type that supports [persistent disks](https://render.com/docs/disks).

### Dashboard (manual)

1. **New → Web Service** from this monorepo (or a small deploy repo that only holds the Dockerfile).
2. **Runtime:** Docker (or Native + download binary in build — Docker is simpler).
3. **Dockerfile path / context** pointing at the PocketBase deploy files.
4. **Persistent disk:**
   - Name: e.g. `pb-data`
   - Mount path: `/pb/pb_data`
   - Size: start at **1 GB** (raise as uploads grow)
5. **Health check path:** `/api/health`
6. **Start / docker command** (must honor `$PORT` and CORS):

```bash
/pb/pocketbase serve --http=0.0.0.0:$PORT --dir=/pb/pb_data --origins=https://stirring-figolla-e187f5.netlify.app,http://localhost:5173,http://127.0.0.1:5173
```

7. **Env vars:** `PB_ADMIN_EMAIL`, `PB_ADMIN_PASSWORD` (and optional `GOMEMLIMIT`, `PB_ENCRYPTION_KEY`).
8. Deploy → open `https://<service>.onrender.com/api/health`.
9. Create superuser if not done via start/entrypoint:

```bash
# Render Shell (with disk mounted)
/pb/pocketbase superuser upsert "$PB_ADMIN_EMAIL" "$PB_ADMIN_PASSWORD" --dir=/pb/pb_data
```

10. Import schema from your machine:

```bash
export POCKETBASE_URL=https://<service>.onrender.com
export PB_ADMIN_EMAIL=...
export PB_ADMIN_PASSWORD=...
pnpm --filter @orbitlab/pocketbase import-schema
```

### Blueprint (IaC)

Copy-ready `render.yaml` fields and notes: **[render-blueprint.md](./render-blueprint.md)**.

### Render caveats

- Redeploys keep data **only** if the disk is attached and mount path matches `--dir`.
- SQLite + disk ⇒ stay at **one** instance; do not enable multi-instance scaling.
- Free tier sleep / no disk ⇒ unsuitable for production PB.

---

## Fly.io

Based on the [official community guide](https://github.com/pocketbase/pocketbase/discussions/537).

### 1. Dockerfile

Place the Dockerfile above in a deploy directory (e.g. `apps/pocketbase/deploy/` or a dedicated host repo). Pin `PB_VERSION=0.25.8`.

### 2. Launch

```bash
flyctl auth login
cd path/to/dockerfile-dir
flyctl launch --build-only
# Answer prompts; skip Postgres/Redis. Do not deploy yet if you still need a volume.
```

### 3. Volume

```bash
flyctl volumes create pb_data --size=1 --region <same-as-primary_region>
```

Confirm single-volume warning if you only run one machine (expected for SQLite).

### 4. `fly.toml` essentials

```toml
app = "orbitlab-pb"          # your app name
primary_region = "ams"       # pick nearest

[build.args]
  PB_VERSION = "0.25.8"

[mounts]
  source = "pb_data"
  destination = "/pb/pb_data"

[http_service]
  internal_port = 8080
  force_https = true
  auto_stop_machines = false   # keep PB warm; avoid cold SQLite + realtime drops
  auto_start_machines = true
  min_machines_running = 1
  processes = ["app"]

  [[http_service.checks]]
    interval = "15s"
    timeout = "2s"
    grace_period = "10s"
    method = "GET"
    path = "/api/health"
```

Serve with CORS (override `CMD` via `[processes]` or a small entrypoint script):

```toml
[processes]
  app = "/pb/pocketbase serve --http=0.0.0.0:8080 --dir=/pb/pb_data --origins=https://stirring-figolla-e187f5.netlify.app,http://localhost:5173,http://127.0.0.1:5173"
```

Optional secrets:

```bash
flyctl secrets set \
  PB_ADMIN_EMAIL="admin@example.com" \
  PB_ADMIN_PASSWORD="use-a-long-random-secret" \
  GOMEMLIMIT="384MiB"
```

### 5. Deploy

```bash
flyctl deploy
```

Public URL: `https://<app>.fly.dev`  
Admin UI: `https://<app>.fly.dev/_/`  
Health: `https://<app>.fly.dev/api/health`

### 6. Superuser via CLI (preferred)

```bash
fly ssh console -C \
  '/pb/pocketbase superuser upsert "$PB_ADMIN_EMAIL" "$PB_ADMIN_PASSWORD" --dir=/pb/pb_data'
```

If secrets are not expanded in remote shell, pass values explicitly (do not log them in CI transcripts).

Alternatively use a migration that creates the initial superuser ([docs](https://pocketbase.io/docs/js-migrations/#creating-initial-superuser)) and `COPY` `pb_migrations` in the Dockerfile.

### 7. Schema import

```bash
export POCKETBASE_URL=https://<app>.fly.dev
export PB_ADMIN_EMAIL=...
export PB_ADMIN_PASSWORD=...
pnpm --filter @orbitlab/pocketbase import-schema
```

### Fly caveats

- **Idle proxy timeout (~60s)** can log realtime disconnects; the JS SDK reconnects automatically.
- Prefer **`auto_stop_machines = false`** and **`min_machines_running = 1`** so the volume stays attached to a running machine.
- Memory: if you OOM, raise VM RAM and/or set `GOMEMLIMIT`.
- Volume snapshots: Fly keeps short-lived volume snapshots — still take your own backups (below).

---

## Backups

| Method | When |
|--------|------|
| Dashboard **Settings → Backups** | Zip of `pb_data` (app goes read-only during zip) |
| Host volume snapshots | Render disks / Fly volumes — secondary safety net |
| Manual copy | Stop or quiesce writes, copy entire `pb_data` directory |

Restore = replace `pb_data` (app stopped) with the snapshot, then start again.

---

## Production hardening (recommended)

From [PocketBase production docs](https://pocketbase.io/docs/going-to-production/):

1. **SMTP** — configure real mail (Brevo, SES, etc.) in Admin → Settings → Mail (auth emails).
2. **Rate limiter** — Admin → Settings → Application.
3. **Review API rules** — [../rules.md](../rules.md) before open registration.
4. **Encryption key** — optional `PB_ENCRYPTION_KEY` + `--encryptionEnv` for settings at rest.
5. **Never** ship `PB_ADMIN_*` to Netlify `VITE_*` or client bundles.

---

## Post-deploy checklist

Use this as the final go-live gate.

### Infrastructure

- [ ] Single instance only (no multi-replica scale for PB)
- [ ] Persistent volume mounted at the same path as `--dir` (e.g. `/pb/pb_data`)
- [ ] Process binds `0.0.0.0` and correct port (`$PORT` on Render, `8080` on Fly)
- [ ] Health check `GET /api/health` returns 200
- [ ] HTTPS works on the public host URL

### Auth & data

- [ ] Superuser created via **CLI** `superuser upsert` (or verified after browser installer)
- [ ] `pb_schema.json` imported (`pnpm --filter @orbitlab/pocketbase import-schema`)
- [ ] Admin UI reachable at `https://<host>/_/`
- [ ] Backup strategy noted (dashboard backups and/or volume snapshots)

### CORS & web

- [ ] `--origins` includes `https://stirring-figolla-e187f5.netlify.app`
- [ ] `--origins` includes `http://localhost:5173` and `http://127.0.0.1:5173` (dev)
- [ ] Netlify env: `VITE_DATA_BACKEND=pocketbase`, `VITE_POCKETBASE_URL=https://<host>`
- [ ] Netlify redeployed after env change; header badge shows **POCKETBASE**
- [ ] Browser login / design load from SPA works without CORS errors

### Security

- [ ] Admin password only in host secrets / local shell — not in git
- [ ] [rules.md](../rules.md) reviewed for public registration
- [ ] SMTP configured if email verification / reset is required

---

## TR (kısa)

- **Tek binary**, **tek instance**, **disk = `pb_data`** (Render disk / Fly volume).
- Port: Render `$PORT`, Fly genelde `8080`; health: `/api/health`.
- CORS: `https://stirring-figolla-e187f5.netlify.app` + `localhost:5173` / `127.0.0.1:5173` (`--origins`).
- Superuser: mümkünse `pocketbase superuser upsert EMAIL PASS --dir=...` (CLI), tarayıcı installer son çare.
- Şema: yerelde `POCKETBASE_URL` + `PB_ADMIN_*` ile `pnpm pb:import`.
- Web: Netlify’da `VITE_POCKETBASE_URL` + `VITE_DATA_BACKEND=pocketbase`, sonra redeploy.
- Ayrıntılı Render blueprint: [render-blueprint.md](./render-blueprint.md). Yerel akış: [../README.md](../README.md).

---

## See also

| Doc | Topic |
|-----|--------|
| [../README.md](../README.md) | Local binary, Docker Compose, schema import |
| [render-blueprint.md](./render-blueprint.md) | Render `render.yaml` blueprint |
| [../rules.md](../rules.md) | API rule policy |
| [../seed.md](../seed.md) | Seed / admin notes |
| [../../../docs/DEPLOY.md](../../../docs/DEPLOY.md) | Netlify SPA deploy |
| [PocketBase production](https://pocketbase.io/docs/going-to-production/) | Upstream production guide |
