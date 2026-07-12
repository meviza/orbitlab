# OrbitLab — PocketBase

Self-hosted BaaS for Auth, collections, files, and (later) realtime.

Schema source of truth in this folder:

| File | Purpose |
|------|---------|
| [`pb_schema.json`](./pb_schema.json) | Importable collections export (PB ≥ 0.22 `fields` format) |
| [`rules.md`](./rules.md) | Human-readable API rule policy |
| [`seed.md`](./seed.md) | Admin + demo user seed notes |
| [`docker-compose.yml`](./docker-compose.yml) | Docker alternative to the local binary |

## Collections (enterprise sketch)

| Collection | Type | Purpose |
|------------|------|---------|
| `users` | auth | Email auth + `plan`, `edu_verified`, `display_name` |
| `designs` | base | Rocket model JSON, owner-scoped |
| `sim_runs` | base | Run summary metrics + module ids |
| `sensor_devices` | base | Pro/edu device registry (`token_hash`) |
| `sensor_samples` | base | Pro/edu telemetry batches |

Math does **not** run inside PocketBase — see `docs/MATH.md` and `@orbitlab/sim-core`.

---

## Mac local flow (recommended)

**Prerequisites:** Node 20+, pnpm 9+, `curl`, `unzip`.

From the monorepo root:

```bash
pnpm install

# 1) Download pinned PocketBase into apps/pocketbase/bin/
pnpm pb:download
# equivalent: pnpm --filter @orbitlab/pocketbase download

# 2) Start (http://127.0.0.1:8090)
pnpm pb:serve

# 3) In another terminal — create superuser (first time only)
cd apps/pocketbase
./bin/pocketbase superuser upsert admin@orbitlab.local 'CHANGE_ME_ADMIN_PASSWORD'

# 4) Import collections
export PB_ADMIN_EMAIL=admin@orbitlab.local
export PB_ADMIN_PASSWORD='CHANGE_ME_ADMIN_PASSWORD'
pnpm pb:import
```

Or work only inside this package:

```bash
cd apps/pocketbase
pnpm download
pnpm serve
# … superuser upsert …
pnpm import-schema
```

| Script | What it does |
|--------|----------------|
| `pnpm download` | Fetches PocketBase **v0.25.8** (override with `PB_VERSION`) for current OS/arch → `./bin/pocketbase` |
| `pnpm serve` | Runs `./bin/pocketbase serve --dir=./pb_data --http=127.0.0.1:8090` |
| `pnpm import-schema` | Imports `pb_schema.json` via JS SDK (`collections.import`) |

### Architecture notes (macOS)

| Chip | Download target |
|------|-----------------|
| Apple Silicon (M1–M4) | `darwin_arm64` (auto-detected) |
| Intel Mac | `darwin_amd64` (auto-detected) |

```bash
# force re-download
PB_FORCE=1 pnpm download

# pin / change version
PB_VERSION=0.25.8 pnpm download
PB_VERSION=latest pnpm download

# custom bind address
PB_HTTP=127.0.0.1:8090 pnpm serve
```

- API: `http://127.0.0.1:8090`
- Admin UI: `http://127.0.0.1:8090/_/`

If the binary is missing, `serve` exits with a clear error pointing at `pnpm download`.

---

## Docker flow (alternative)

```bash
cd apps/pocketbase

# optional: superuser bootstrap via compose env
export PB_ADMIN_EMAIL=admin@orbitlab.local
export PB_ADMIN_PASSWORD='CHANGE_ME_ADMIN_PASSWORD'

docker compose up -d
# → http://127.0.0.1:8090/_/

# import schema from the host (needs Node deps from pnpm install)
export POCKETBASE_URL=http://127.0.0.1:8090
pnpm import-schema

docker compose down          # stop
docker compose down -v       # stop (does not remove ./pb_data bind mount)
```

Data persists in `./pb_data` (gitignored). Image: [`ghcr.io/muchobien/pocketbase`](https://github.com/muchobien/pocketbase-docker).

---

## Web app wiring

The Vite app reads the BaaS URL from:

```bash
# apps/web/.env (or shell when starting Vite)
VITE_POCKETBASE_URL=http://127.0.0.1:8090
```

Default web DI still uses **in-memory** adapters for a no-backend demo. Point composition root at `@orbitlab/infrastructure` PocketBase repositories when this server is up.

```ts
import {
  createPocketBaseClient,
  PocketBaseDesignRepository,
  PocketBaseAuthAdapter,
} from "@orbitlab/infrastructure";

const pb = await createPocketBaseClient(
  import.meta.env.VITE_POCKETBASE_URL
);
```

Never put `PB_ADMIN_*` in the browser bundle.

---

## Import schema details

### CLI (preferred)

```bash
export PB_ADMIN_EMAIL=admin@orbitlab.local
export PB_ADMIN_PASSWORD='…'
# optional: POCKETBASE_URL=http://127.0.0.1:8090
pnpm import-schema
```

Uses PocketBase JS SDK:

```js
await pb.collection("_superusers").authWithPassword(email, password);
await pb.collections.import(schema, false); // deleteMissing = false
```

Compatible with PocketBase **0.22+** (fields-based collections). Default `deleteMissing=false` merges without wiping unrelated collections. Set `PB_DELETE_MISSING=true` only when you intend destructive sync.

### Admin UI

1. Open Admin → **Settings** → **Import collections**.
2. Paste or upload `pb_schema.json`.
3. Prefer **merge** / do not delete missing.
4. Confirm `users` gains `plan`, `edu_verified`, `display_name` and base collections appear.

If import complains about the existing default `users` collection id, import base collections first or align ids via Admin export and re-export into this file.

---

## Environment variables

| Variable | Used by | Example |
|----------|---------|---------|
| `VITE_POCKETBASE_URL` | `apps/web` | `http://127.0.0.1:8090` |
| `POCKETBASE_URL` | import script / CI | `http://127.0.0.1:8090` |
| `PB_ADMIN_EMAIL` | import + Docker bootstrap | `admin@orbitlab.local` |
| `PB_ADMIN_PASSWORD` | import + Docker bootstrap | *(secret)* |
| `PB_HTTP` | `serve` bind host:port | `127.0.0.1:8090` |
| `PB_DATA_DIR` | `serve` data path | `./pb_data` |
| `PB_VERSION` | `download` | `0.25.8` or `latest` |
| `PB_FORCE` | `download` re-fetch | `1` |

Copy [`.env.example`](./.env.example) → `.env` for local convenience (gitignored).

---

## Production hosting notes

- Single binary on Render / Fly.io / VPS (see `docs/ARCHITECTURE.md`).
- Persist `pb_data` (SQLite + storage) on a volume.
- Terminate TLS at reverse proxy; set public URL accordingly.
- Back up `pb_data` regularly.
- Apply rules review in [rules.md](./rules.md) before opening registration publicly.

## Security summary

- Designs and sim runs are **owner-only**.
- `plan` / `edu_verified` are **not client-writable** (see update rule).
- Sensor collections require **pro or edu** plan on `@request.auth`.
- Store device **token hashes** only; samples are immutable (`updateRule: null`).

## TR (kısa)

```bash
pnpm pb:download && pnpm pb:serve
# superuser oluştur → PB_ADMIN_* ayarla → pnpm pb:import
# Web: VITE_POCKETBASE_URL=http://127.0.0.1:8090
# Docker: cd apps/pocketbase && docker compose up -d
```
