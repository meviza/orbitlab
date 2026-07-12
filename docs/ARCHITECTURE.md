# Architecture

**Locked decisions (2026-07-12):**

| Layer | Choice |
|-------|--------|
| Web | Netlify (React + dark UI + Three.js / R3F) |
| BaaS / DB | **PocketBase** (Auth, SQLite, files, realtime, admin UI) |
| Hosting PocketBase | Self-host (Render / Fly.io / VPS) — single binary |
| Math / sim | `packages/sim-core` modules (TS → Worker → optional WASM) |
| Desktop later | Tauri + same sim-core |
| Not in scope | Supabase, Cloudflare D1 as primary DB |

Deep dive on numerics: [MATH.md](./MATH.md).

## High-level

```
┌─────────────────────────────────────────────────────────────┐
│  apps/web (Netlify)                                         │
│  React + dark UI + Three.js editor + charts + report UI     │
└───────────────────────────┬─────────────────────────────────┘
                            │ HTTPS (JS SDK / REST)
┌───────────────────────────▼─────────────────────────────────┐
│  PocketBase (self-hosted)                                   │
│  Auth · collections (SQL/SQLite) · file storage · realtime  │
│  Admin UI · API rules (RBAC) · optional hooks               │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  packages/sim-core  (runs in browser Worker / desktop)      │
│  Calculation modules: free + pro · report traces            │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  apps/desktop (later)                                       │
│  Offline projects; optional login for pro entitlements      │
└─────────────────────────────────────────────────────────────┘
```

## Why PocketBase (vs the shortlist)

| Option | Verdict for OrbitLab |
|--------|----------------------|
| **PocketBase** ✅ | Auth + DB + files + realtime + **built-in admin** in one binary. Open source. Cheap to host. Matches SaaS + contributor-friendly stack. |
| Appwrite | Strong but heavier ops; keep as scale-up option |
| Nhost | Good Postgres/GraphQL path; more moving parts than we need now |
| Neon only | Excellent Postgres; still need auth, files, admin API ourselves |
| Firebase | NoSQL + lock-in; weaker fit for open relational models |
| Turso | Great edge SQL; no full BaaS (auth/admin DIY) |
| Cloudflare D1/R2 | Deferred; PocketBase covers the same product needs with less glue |

**Realtime:** useful later for pro sensor streams and multi-tab project sync. Not required for MVP sim (sim is client-side).

**Math is not in PocketBase.** See [MATH.md](./MATH.md).

## PocketBase collections (draft)

| Collection | Purpose |
|------------|---------|
| `users` | Built-in auth; profile fields: `plan`, `edu_verified`, `locale` |
| `designs` | Rocket model JSON, owner, title, updated |
| `sim_runs` | Summary metrics, module ids used, optional file refs |
| `files` | PDF/CSV/thrust curves (PocketBase file fields or linked) |
| `sensor_devices` | Pro: device tokens, project link |
| `sensor_samples` | Pro: validated telemetry batches |
| `calc_requests` | Optional mirror of GitHub calculation requests |
| `admin` | Superuser via PocketBase admins (ops), not end-users |

API rules: users read/write own designs; pro fields gated by `plan`; public read only for shared demos if we add them.

## Simulation core

**Phase order:**

1. TypeScript pure functions (testable, portable)
2. Web Worker so UI stays smooth
3. Optional C/Rust → WASM for heavy Monte Carlo / fine time-step runs

Modules (examples): mass properties, aero (Barrowman-class), motors, atmosphere, 3DOF→6DOF, recovery events.

Each module: inputs, assumptions, equations (report), outputs, free/pro gate — full contract in [MATH.md](./MATH.md).

## Report engine

```
sim run result + selected modules
  → step templates (Markdown + KaTeX)
  → CSV tables
  → PDF (print CSS first; server render later if needed)
  → optional PocketBase file upload
```

User preference: off | summary | full steps.

## Sensor protocol (pro)

Still security-first (sign, schema, rate limit, no ignition commands).  
PocketBase stores devices + samples; **validation** can run in:

- client pre-check + PocketBase API rules, and/or  
- small Go hooks / sidecar later if rules are not enough  

## Auth, plans, admin

- **End-user auth:** PocketBase users (email/password; OAuth later)
- **Plans:** `free` | `pro` | `edu` on user record (payment webhook updates field)
- **Edu:** verify university email domain / manual review flag
- **Ops admin:** PocketBase Admin UI for collections + optional `apps/web` admin views for product metrics

## Desktop

Same `sim-core` + local `*.orbit.json`. Optional login to unlock pro modules via PocketBase token.

## OpenRocket

Clean-room implementations; no GPL source in tree — [LICENSING.md](./LICENSING.md).
