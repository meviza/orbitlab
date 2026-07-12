# Auth troubleshooting

## “Something went wrong while processing your request”

This is the **default PocketBase JS SDK message** when the HTTP call never completes properly — most often:

1. **PocketBase is not running** (most common on a fresh machine)
2. Wrong URL (`localhost` vs `127.0.0.1`, wrong port)
3. Browser / CORS edge cases (rare on same machine with Vite)

It is **not** usually “email already taken” or “weak password” — those return field-level 400 errors.

### Fix (local Mac)

```bash
cd /Users/keremcelik/projects/orbitlab
pnpm pb:download   # once
pnpm pb:serve      # leave this terminal open
# health: http://127.0.0.1:8090/api/health  → { "code": 200, ... }
```

First-time admin (CLI is more reliable than the install browser link):

```bash
cd apps/pocketbase
./bin/pocketbase superuser upsert 'admin@orbitlab.local' 'YOUR_LONG_SECRET' --dir=./pb_data
export PB_ADMIN_EMAIL=admin@orbitlab.local
export PB_ADMIN_PASSWORD='YOUR_LONG_SECRET'
pnpm --filter @orbitlab/pocketbase import-schema
```

Web app in PocketBase mode:

```bash
# apps/web/.env
VITE_DATA_BACKEND=pocketbase
VITE_POCKETBASE_URL=http://127.0.0.1:8090
```

Restart `pnpm dev`. Header badge should show **POCKETBASE**.

### Offline without accounts

```bash
VITE_DATA_BACKEND=memory
```

Guest session — no signup required.

### Superuser install link fails in browser

PocketBase prints a one-time `/_/#/pbinstal/...` URL. If that page shows the same generic error, use **`superuser upsert` CLI** (above) instead of the browser form.

### Password rules

Users collection requires **min 8 characters** (`password` field). Use a longer password when testing signup.
