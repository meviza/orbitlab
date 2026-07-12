# Architecture

## High-level

```
┌─────────────────────────────────────────────────────────────┐
│  apps/web (Netlify)                                         │
│  React + dark UI + Three.js / R3F editor + charts           │
└───────────────────────────┬─────────────────────────────────┘
                            │ HTTPS
┌───────────────────────────▼─────────────────────────────────┐
│  Cloudflare Workers API                                     │
│  Auth, projects, entitlements, admin, sensor ingest         │
└───────┬─────────────────┬─────────────────┬─────────────────┘
        │                 │                 │
   ┌────▼────┐      ┌─────▼─────┐     ┌─────▼─────┐
   │ D1 SQL  │      │ R2 files  │     │ KV/cache  │
   │ users,  │      │ PDF, CSV, │     │ sessions  │
   │ designs │      │ logs, ORK │     │ rate lim. │
   └─────────┘      └───────────┘     └───────────┘

┌─────────────────────────────────────────────────────────────┐
│  packages/sim-core                                          │
│  Pure physics (browser Worker / WASM) — same core offline   │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  apps/desktop (later)                                       │
│  Tauri shell → loads same sim-core + local project files    │
└─────────────────────────────────────────────────────────────┘
```

## Why this split

- **Sim in the client (Worker/WASM)** keeps latency low, scales cheaply, and works offline for desktop.
- **API on Cloudflare** owns identity, billing flags, admin, and **sensor protocol** (must not be trust-the-client).
- **Netlify** ships the static/SSR web app; teams already use it.
- **D1 + R2** cover SaaS needs without Supabase: SQL for relational data, object storage for large artifacts.

## Cloudflare vs Supabase (decision)

| Need | Supabase | Cloudflare path |
|------|----------|-----------------|
| SQL DB | Postgres | **D1** (SQLite edge) |
| Auth | Built-in | Workers + JWT/session (or Clerk/Auth.js adapter) |
| Files | Storage | **R2** |
| Edge functions | Edge Functions | **Workers** |
| Realtime | Realtime | Durable Objects / Queues (as needed) |
| Postgres features | Rich | D1 is simpler — good for MVP; migrate later if needed |

**Verdict:** Cloudflare covers our MVP SaaS surface (users, designs, plans, files, API). It is **not** a 1:1 Postgres clone (no heavy PostGIS, limited complex joins at huge scale), which is fine for OrbitLab phase 1–2.

## Simulation core

**Phase order:**

1. TypeScript pure functions (testable, portable)
2. Web Worker so UI stays smooth
3. Optional C/Rust → WASM for heavy Monte Carlo / fine time-step runs

Modules (examples):

- mass properties (CG, mass, inertia approx.)
- aerodynamics (Cd models, Barrowman-class stability baseline)
- motor thrust curves (import / manual)
- atmosphere / wind simple models
- 3DOF then 6DOF trajectory integration
- recovery deployment events

Each module declares: inputs, assumptions, equations (for report engine), outputs, free/pro gate.

## Report engine

Pipeline:

```
sim run result + selected modules
  → symbolic/step templates (Markdown + KaTeX)
  → CSV tables (time series)
  → PDF (print CSS or server-side renderer later)
```

User preference: off | summary | full steps.

## Sensor protocol (pro, security-first)

Design principles:

1. **Device identity** — API keys or mTLS-style device tokens per user/project; rotatable.
2. **Signed payloads** — HMAC or asymmetric signatures; reject unsigned.
3. **Schema validation** — strict JSON Schema / protobuf; drop unknown fields carefully.
4. **Rate limits + quotas** — per device and per account.
5. **Classification** — server-side feature extraction (alt, accel, GPS quality flags); never run untrusted code from devices.
6. **No command channel to ignition** — telemetry ingest only in v1.
7. **Audit log** — who ingested what, when.

## Auth & admin

- Email/password or OAuth (later)
- Roles: `user`, `admin`
- Entitlements: `plan=free|pro|edu`, feature flags
- Admin: user list, plan override, disable accounts, view usage metrics

## Desktop

- Same `sim-core` + local project format (`*.orbit.json`)
- Optional login for pro unlock sync
- Prefer **Tauri** for size/security

## OpenRocket relationship

- Prefer **clean-room** reimplementation of published methods
- Optional **import** of common data formats (thrust curves, component CSV) under separate review
- Do **not** vendor GPL Java sources into this Apache-2.0 tree without a deliberate dual-licensing plan (see LICENSING.md)
