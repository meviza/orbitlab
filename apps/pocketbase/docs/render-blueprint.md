# Render Blueprint — OrbitLab PocketBase

Infrastructure-as-code notes for hosting OrbitLab PocketBase on [Render](https://render.com/) via a Blueprint (`render.yaml`).

Full multi-host guide (Fly.io, CORS, superuser CLI, env list): **[CLOUD-HOST.md](./CLOUD-HOST.md)**.  
Local binary & schema: **[../README.md](../README.md)**.

Official Blueprint reference: [render.com/docs/blueprint-spec](https://render.com/docs/blueprint-spec).

---

## Why a paid plan + disk

PocketBase stores everything under `pb_data` (SQLite + uploads). Render **persistent disks are not available on free web services**. Use at least a **starter** (or higher) web service with an attached disk, or the database will reset on every deploy.

Also: **one instance only** — SQLite does not support multi-instance writers. Do not set `numInstances` > 1 or enable autoscaling on this service.

---

## Prerequisites

1. Render account + linked GitHub/GitLab repo (this monorepo or a slim deploy repo).
2. A `Dockerfile` that installs PocketBase **linux_amd64** and can serve with `--dir` on the disk mount (see [CLOUD-HOST.md](./CLOUD-HOST.md#dockerfile-shared-pattern)).
3. Secrets ready offline (not committed):
   - Superuser email / password
   - Optional encryption key (32 characters)

Pinned version used by OrbitLab local scripts: **`0.25.8`**.

---

## Example `render.yaml`

Place this at the **repo root** as `render.yaml` (Render’s default), **or** keep it documented here and paste into a Blueprint-only branch / deploy repo. Paths below assume a monorepo layout:

```text
repo/
  apps/pocketbase/
    deploy/
      Dockerfile          # production image (not committed binary)
  render.yaml             # optional root blueprint
```

If you do not want a root `render.yaml` in the main app, copy the service block into Render Dashboard → **Blueprints** or a dedicated infra repo.

```yaml
# OrbitLab — PocketBase on Render
# Docs: apps/pocketbase/docs/CLOUD-HOST.md
# Blueprint spec: https://render.com/docs/blueprint-spec
#
# IMPORTANT
# - Requires a plan that supports disks (not free web).
# - Single instance only (SQLite).
# - Set secret env values in the Dashboard (sync: false).

services:
  - type: web
    name: orbitlab-pocketbase
    runtime: docker
    plan: starter                    # disk-capable; adjust to your workspace
    region: frankfurt                # oregon | ohio | virginia | frankfurt | singapore
    # Monorepo: build only the PB deploy context
    rootDir: apps/pocketbase/deploy  # directory that contains Dockerfile
    dockerfilePath: ./Dockerfile     # relative to rootDir
    # Honor Render's PORT; persist under the disk mount; restrict CORS
    dockerCommand: >-
      /pb/pocketbase serve
      --http=0.0.0.0:$PORT
      --dir=/pb/pb_data
      --origins=https://stirring-figolla-e187f5.netlify.app,http://localhost:5173,http://127.0.0.1:5173
    healthCheckPath: /api/health
    autoDeployTrigger: commit        # or checksPass | off
    disk:
      name: pb-data
      mountPath: /pb/pb_data
      sizeGB: 1                      # increase later; cannot shrink
    envVars:
      - key: PB_ADMIN_EMAIL
        sync: false                  # set in Dashboard / Blueprint apply prompt
      - key: PB_ADMIN_PASSWORD
        sync: false
      - key: PB_ORIGINS
        value: https://stirring-figolla-e187f5.netlify.app,http://localhost:5173,http://127.0.0.1:5173
      - key: GOMEMLIMIT
        value: 384MiB
      # Optional settings encryption (32-char secret):
      # - key: PB_ENCRYPTION_KEY
      #   sync: false
      # If encryption is enabled, add --encryptionEnv=PB_ENCRYPTION_KEY to dockerCommand.
```

### Field map (what matters)

| Blueprint field | OrbitLab value | Why |
|-----------------|----------------|-----|
| `type` | `web` | Public HTTPS API + Admin UI |
| `runtime` | `docker` | Single static binary image |
| `plan` | `starter`+ | Disks require a paid-capable plan |
| `dockerCommand` | `serve … $PORT … /pb/pb_data … --origins=…` | Correct bind, data dir, CORS |
| `healthCheckPath` | `/api/health` | Zero-downtime gate |
| `disk.mountPath` | `/pb/pb_data` | **Must** match `--dir` |
| `disk.sizeGB` | `1` (min practical) | Grow as file storage grows |
| `envVars` with `sync: false` | Admin secrets | Never commit passwords |

### CORS origins (keep in sync)

| Origin | Role |
|--------|------|
| `https://stirring-figolla-e187f5.netlify.app` | Production SPA |
| `http://localhost:5173` | Vite dev |
| `http://127.0.0.1:5173` | Vite dev (alt host) |

Update both `dockerCommand` `--origins` and `PB_ORIGINS` if you add a custom Netlify domain.

---

## Dockerfile expected by the blueprint

`apps/pocketbase/deploy/Dockerfile` (create when you host — not required for local `pnpm pb:serve`):

```dockerfile
FROM alpine:latest

ARG PB_VERSION=0.25.8

RUN apk add --no-cache unzip ca-certificates

ADD https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_linux_amd64.zip /tmp/pb.zip
RUN unzip /tmp/pb.zip -d /pb/ \
  && chmod +x /pb/pocketbase \
  && rm /tmp/pb.zip

# pb_data is provided by the Render disk at runtime
EXPOSE 8080
CMD ["/pb/pocketbase", "serve", "--http=0.0.0.0:8080", "--dir=/pb/pb_data"]
```

`dockerCommand` in the blueprint **overrides** `CMD` so Render’s `$PORT` is used.

### Optional: superuser on every start

Prefer explicit CLI after first deploy (see below). If you must bootstrap from the start command:

```yaml
dockerCommand: >-
  /bin/sh -c
  '/pb/pocketbase superuser upsert "$PB_ADMIN_EMAIL" "$PB_ADMIN_PASSWORD" --dir=/pb/pb_data
  && exec /pb/pocketbase serve --http=0.0.0.0:$PORT --dir=/pb/pb_data
  --origins=https://stirring-figolla-e187f5.netlify.app,http://localhost:5173,http://127.0.0.1:5173'
```

Requires `PB_ADMIN_EMAIL` and `PB_ADMIN_PASSWORD` in service env. Upsert is idempotent.

---

## Apply the Blueprint

1. Push the Dockerfile (and optional root `render.yaml`) to Git.
2. Render Dashboard → **New** → **Blueprint** → select the repo.
3. Confirm service plan/region; enter secret env values when prompted (`sync: false`).
4. Wait for first deploy; open `https://<service>.onrender.com/api/health`.

Validate YAML locally (Render CLI ≥ 2.7):

```bash
render blueprints validate
# or: render validate
```

(Exact CLI subcommand may vary by CLI version — see current Render CLI docs.)

---

## Superuser via CLI (preferred)

After the disk is mounted and the service is up:

1. Render → service → **Shell** (or SSH equivalent).
2. Run:

```bash
/pb/pocketbase superuser upsert "$PB_ADMIN_EMAIL" "$PB_ADMIN_PASSWORD" --dir=/pb/pb_data
```

Avoid relying only on the browser installer token printed in logs.

Then import schema from your workstation (repo root):

```bash
export POCKETBASE_URL=https://<service>.onrender.com
export PB_ADMIN_EMAIL='…'
export PB_ADMIN_PASSWORD='…'
pnpm --filter @orbitlab/pocketbase import-schema
```

Details: [../README.md](../README.md#import-schema-details).

---

## Environment variable list (no real passwords)

| Key | In Blueprint | Example / notes |
|-----|--------------|-----------------|
| `PORT` | Injected by Render | Used in `dockerCommand` as `$PORT` |
| `PB_ADMIN_EMAIL` | `sync: false` | Superuser email |
| `PB_ADMIN_PASSWORD` | `sync: false` | Strong secret |
| `PB_ORIGINS` | Optional static | Same list as `--origins` |
| `GOMEMLIMIT` | Optional | e.g. `384MiB` |
| `PB_ENCRYPTION_KEY` | Optional `sync: false` | 32 chars; needs `--encryptionEnv` |
| `POCKETBASE_URL` | **Not on Render** | Local/CI import only |
| `VITE_POCKETBASE_URL` | **Netlify**, not PB service | Public `https://…onrender.com` |
| `VITE_DATA_BACKEND` | **Netlify** | `pocketbase` when switching off memory mode |

---

## Netlify handoff

When the Render URL is healthy:

```bash
# Netlify site env (build-time)
VITE_DATA_BACKEND=pocketbase
VITE_POCKETBASE_URL=https://<service>.onrender.com
```

Redeploy the SPA. See monorepo [`docs/DEPLOY.md`](../../../docs/DEPLOY.md).

---

## Operational notes

| Topic | Guidance |
|-------|----------|
| Deploys | Disk contents survive; image layers rebuild |
| Zero-downtime | Health check must pass before traffic shift |
| Scaling | Keep **1** instance |
| Disk growth | Increase `sizeGB` only (cannot shrink) |
| Backups | PocketBase Admin → Settings → Backups; also consider external copies of `pb_data` |
| Custom domain | Render service domains + add origin to `--origins` |
| Logs | Failed health usually means wrong port, crash loop, or disk path mismatch |

---

## Checklist (Render-specific)

- [ ] Dockerfile builds PocketBase `linux_amd64` at pin `0.25.8` (or chosen upgrade)
- [ ] Blueprint / service plan supports **disk**
- [ ] Disk mount path = `/pb/pb_data` and matches `--dir`
- [ ] `dockerCommand` uses `--http=0.0.0.0:$PORT`
- [ ] `healthCheckPath: /api/health` → 200
- [ ] CORS origins include Netlify + local Vite
- [ ] `PB_ADMIN_*` set only as secrets (`sync: false`)
- [ ] Superuser via **CLI** `superuser upsert`
- [ ] Schema imported from laptop/CI
- [ ] Netlify `VITE_*` pointed at Render HTTPS URL and redeployed
- [ ] Single instance; backups configured

---

## TR (kısa)

- Render’da PocketBase için **disk zorunlu** (free web yetmez).
- Blueprint: `runtime: docker`, `healthCheckPath: /api/health`, disk → `/pb/pb_data`.
- Start: `--http=0.0.0.0:$PORT` + `--origins=…Netlify…,localhost:5173…`.
- Superuser: Shell’de `superuser upsert` (tercih); şema yerelden import.
- Genel rehber: [CLOUD-HOST.md](./CLOUD-HOST.md). Yerel: [../README.md](../README.md).

---

## See also

- [CLOUD-HOST.md](./CLOUD-HOST.md) — Render + Fly production guide
- [../README.md](../README.md) — local serve / import
- [Render disks](https://render.com/docs/disks)
- [Render health checks](https://render.com/docs/health-checks)
- [Blueprint spec](https://render.com/docs/blueprint-spec)
