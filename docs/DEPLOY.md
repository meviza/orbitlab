# Deploy

OrbitLab ships the web UI as a **static Vite SPA** on [Netlify](https://www.netlify.com/). Data/auth can later run on self-hosted PocketBase; the first public deploy uses the **in-memory** backend so the demo works without a BaaS host.

## Live demo

| | |
|--|--|
| **URL** | https://stirring-figolla-e187f5.netlify.app |
| **Site ID** | `8095f502-65d5-461c-82e8-17dc82b9a319` |
| **Mode** | `memory` (guest / offline) |

CLI redeploy (avoids monorepo interactive picker):

```bash
pnpm --filter @orbitlab/web build
CI=1 netlify deploy --prod --no-build --dir=apps/web/dist \
  --site=8095f502-65d5-461c-82e8-17dc82b9a319 \
  --filter=@orbitlab/web
```

## Prerequisites

- Node **20+**
- **pnpm 9** (see root `packageManager` in `package.json`)
- Netlify account + site linked to this monorepo (GitHub: `meviza/orbitlab` or your fork)

## Netlify (recommended)

### 1. Create / link a site

1. Netlify → **Add new site** → Import from Git (this repo).
2. **Base directory:** leave empty / monorepo root (`.`).  
   Do **not** set base to `apps/web` — the build needs the workspace root for pnpm.
3. Config is read from root [`netlify.toml`](../netlify.toml):
   - **Build command:** `pnpm install --frozen-lockfile && pnpm --filter @orbitlab/web build`
   - **Publish directory:** `apps/web/dist`
4. Deploy. SPA routes fall through to `index.html` via the redirect rule.

### 2. Environment variables

Set in **Site configuration → Environment variables** (or rely on `netlify.toml` `[build.environment]`).

| Variable | Static demo (default) | PocketBase later |
|----------|----------------------|------------------|
| `VITE_DATA_BACKEND` | `memory` | `pocketbase` |
| `VITE_POCKETBASE_URL` | _(omit)_ | Public HTTPS URL of your PB host, e.g. `https://pb.example.com` |
| `NODE_VERSION` | `20` | `20` |

**Static demo (ship this first):**

```bash
VITE_DATA_BACKEND=memory
```

Vite inlines `VITE_*` at **build** time. Changing them requires a new deploy.

**PocketBase (later):**

1. Host PocketBase with HTTPS and CORS allowing your Netlify origin (`https://yoursite.netlify.app` or custom domain).
2. Set:

```bash
VITE_DATA_BACKEND=pocketbase
VITE_POCKETBASE_URL=https://your-pocketbase-host
```

3. Redeploy. Header badge should show **POCKETBASE** when the client can reach the API.

CORS / production PB setup is out of scope for the first static deploy — use `memory` until the host is ready.

### 3. Verify

- Open the Netlify URL → home loads.
- Header badge **MEMORY** for the static demo.
- Client routes (`/editor`, `/sim`, …) refresh without 404 (SPA fallback).
- Optional: run the same build locally with `pnpm --filter @orbitlab/web build` and `pnpm --filter @orbitlab/web preview`.

## Local PocketBase (not used on Netlify static demo)

For full auth/designs against a local BaaS:

```bash
# monorepo root
pnpm pb:download   # once
pnpm pb:serve      # http://127.0.0.1:8090  (Admin UI: /_/)
# first-time admin + schema: see apps/pocketbase/README.md
```

`apps/web/.env` (dev only; not committed for secrets):

```bash
VITE_DATA_BACKEND=pocketbase
VITE_POCKETBASE_URL=http://127.0.0.1:8090
```

Restart `pnpm dev`. See [TROUBLESHOOTING-AUTH.md](./TROUBLESHOOTING-AUTH.md) if the SDK cannot reach PB.

## CI

Every push/PR to `main` runs [`.github/workflows/ci.yml`](../.github/workflows/ci.yml):

1. `pnpm install --frozen-lockfile`
2. `pnpm typecheck`
3. `pnpm test`
4. `pnpm --filter @orbitlab/web build`

Keep the lockfile in sync (`pnpm install`) so CI and Netlify both succeed with `--frozen-lockfile`.

## Deploy checklist

- [ ] CI green on `main` (typecheck + test + web build)
- [ ] Netlify site base = monorepo root; `netlify.toml` applied
- [ ] `VITE_DATA_BACKEND=memory` for static demo (or PB vars + CORS for pocketbase mode)
- [ ] Publish path is `apps/web/dist` after `pnpm --filter @orbitlab/web build`
- [ ] SPA: hard-refresh a deep link does not 404
- [ ] Optional custom domain + HTTPS on Netlify
- [ ] Later: PocketBase host, CORS for Netlify origin, switch `VITE_*` and redeploy

## Useful scripts (root)

```bash
pnpm typecheck
pnpm test
pnpm build:web          # @orbitlab/web only
pnpm ci                 # typecheck + test + build:web (local parity with Actions)
pnpm pb:serve           # local PocketBase only
```
