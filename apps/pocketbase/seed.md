# Seed notes — OrbitLab PocketBase

Manual seed for local / staging. Do not commit real production passwords.

## 1. Superuser (ops admin)

On first `pnpm serve` (or `./bin/pocketbase serve`), the dashboard prompts for a superuser, or from `apps/pocketbase`:

```bash
./bin/pocketbase superuser upsert admin@orbitlab.local 'CHANGE_ME_ADMIN_PASSWORD' --dir=./pb_data
```

- Email: `admin@orbitlab.local` (or your ops email)
- Password: long random secret (password manager)
- Use only for Admin UI + schema import + entitlement fixes
- Same credentials as `PB_ADMIN_EMAIL` / `PB_ADMIN_PASSWORD` for `pnpm import-schema`

## 2. Demo end-user (free)

Via Admin UI → **users** → New record, or API after serve:

| Field | Value |
|-------|--------|
| email | `demo@orbitlab.local` |
| password | `demo-demo-demo` (change in shared envs) |
| passwordConfirm | same |
| display_name | `Demo Pilot` |
| plan | `free` |
| edu_verified | `false` |
| verified | `true` (optional; skips email verification in dev) |

## 3. Demo pro user (optional)

| Field | Value |
|-------|--------|
| email | `pro@orbitlab.local` |
| password | local-only secret |
| display_name | `Pro Pilot` |
| plan | `pro` |
| edu_verified | `false` |

## 4. Demo design (optional)

After demo user exists:

| Field | Value |
|-------|--------|
| title | `Example Model Rocket` |
| owner | relation → demo user id |
| components | `[]` or a minimal nose+body JSON array |
| metadata | `{ "source": "seed" }` |

Example `components` JSON:

```json
[
  {
    "id": "nose-1",
    "kind": "nose",
    "name": "Ogives",
    "params": { "lengthM": 0.1, "massKg": 0.02 }
  },
  {
    "id": "body-1",
    "kind": "body",
    "name": "Body tube",
    "params": { "lengthM": 0.4, "diameterM": 0.04, "massKg": 0.08 }
  }
]
```

## 5. Env vars for apps

See [README.md](./README.md). Web app typically needs:

```bash
VITE_POCKETBASE_URL=http://127.0.0.1:8090
```

## 6. What not to seed in git

- Production superuser passwords
- Real OAuth client secrets
- Live payment webhook secrets
- Device raw tokens (only hashes belong in `sensor_devices.token_hash`)
