# OrbitLab — PocketBase

Self-hosted BaaS for Auth, collections, files, and (later) realtime.

Schema source of truth in this folder:

| File | Purpose |
|------|---------|
| [`pb_schema.json`](./pb_schema.json) | Importable collections export |
| [`rules.md`](./rules.md) | Human-readable API rule policy |
| [`seed.md`](./seed.md) | Admin + demo user seed notes |

## Collections (enterprise sketch)

| Collection | Type | Purpose |
|------------|------|---------|
| `users` | auth | Email auth + `plan`, `edu_verified`, `display_name` |
| `designs` | base | Rocket model JSON, owner-scoped |
| `sim_runs` | base | Run summary metrics + module ids |
| `sensor_devices` | base | Pro/edu device registry (`token_hash`) |
| `sensor_samples` | base | Pro/edu telemetry batches |

Math does **not** run inside PocketBase — see `docs/MATH.md` and `@orbitlab/sim-core`.

## Prerequisites

- PocketBase binary ≥ **0.22** (fields-based schema; tested mentally against 0.25 API docs)
- Download: <https://pocketbase.io/docs/>

```bash
# Example macOS arm64 (adjust version/arch)
curl -L -o pocketbase.zip \
  https://github.com/pocketbase/pocketbase/releases/download/v0.25.8/pocketbase_0.25.8_darwin_arm64.zip
unzip pocketbase.zip -d ./bin
chmod +x ./bin/pocketbase
```

## Run locally

From this directory (or any data dir you prefer):

```bash
mkdir -p pb_data
./bin/pocketbase serve --dir=./pb_data --http=127.0.0.1:8090
```

- API / SPA origin: `http://127.0.0.1:8090`
- Admin UI: `http://127.0.0.1:8090/_/`

Create the first superuser when prompted (or `superuser upsert` — see [seed.md](./seed.md)).

## Import schema

### Admin UI

1. Open Admin → **Settings** → **Import collections** (wording may be “Import/Export”).
2. Paste or upload `pb_schema.json`.
3. Prefer **merge** / `deleteMissing=false` so you do not wipe unrelated collections.
4. Confirm `users` gains `plan`, `edu_verified`, `display_name` and base collections appear.

### API (superuser)

```js
import PocketBase from "pocketbase";
import schema from "./pb_schema.json" with { type: "json" };

const pb = new PocketBase("http://127.0.0.1:8090");
await pb.collection("_superusers").authWithPassword(
  process.env.PB_ADMIN_EMAIL,
  process.env.PB_ADMIN_PASSWORD
);

// false = do not delete collections/fields missing from import
await pb.collections.import(schema, false);
```

If import complains about the existing default `users` collection id, import base collections first or align ids in Admin export and re-export into this file.

## Environment variables

| Variable | Used by | Example |
|----------|---------|---------|
| `VITE_POCKETBASE_URL` | `apps/web` | `http://127.0.0.1:8090` |
| `POCKETBASE_URL` | server scripts / CI | `http://127.0.0.1:8090` |
| `PB_ADMIN_EMAIL` | schema import scripts | `admin@orbitlab.local` |
| `PB_ADMIN_PASSWORD` | schema import scripts | *(secret)* |
| `PB_DATA_DIR` | process wrapper | `./pb_data` |

Never expose superuser credentials to the browser bundle.

## Wiring TypeScript adapters

```ts
import {
  createPocketBaseClient,
  PocketBaseDesignRepository,
  PocketBaseAuthAdapter,
  SystemClock,
  CryptoIdGenerator,
} from "@orbitlab/infrastructure";

const pb = await createPocketBaseClient(
  import.meta.env.VITE_POCKETBASE_URL
);

const designs = new PocketBaseDesignRepository(pb);
const auth = new PocketBaseAuthAdapter(pb);
const clock = new SystemClock();
const ids = new CryptoIdGenerator();
```

Requires optional peer `pocketbase` in the host app, or inject any `PbLike` client.

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
