# Roadmap

Phased so the product ships value early without boiling the ocean.

## Phase 0 — Foundation ✅ (this repo)

- [x] Product decisions documented
- [x] Architecture + licensing notes
- [x] Public GitHub repo
- [x] Contribution / issue templates
- [ ] Project name freeze (OrbitLab working title)

## Phase 1 — Web MVP (target: first usable demo)

- [x] `apps/web` scaffold (React + dark theme)
- [ ] 3D viewport (placeholder rocket + camera) — placeholder only today
- [x] Component list panel (palette polish later)
- [x] Manual design params via design metadata (mass, Cd, thrust…)
- [x] 3DOF vertical / simple ballistic sim in `sim-core`
- [x] Charts (altitude samples + SVG)
- [ ] Optional report: short Markdown/PDF + CSV export
- [x] TR/EN strings baseline
- [ ] Netlify deploy

## Phase 2 — OpenRocket-class depth (free tier)

- [ ] Component library (nose, body tubes, fins, transitions, motors, recovery)
- [x] Mass properties + **lite** stability + simple drag modules (+ golden tests)
- [ ] Full Barrowman-class CP baseline
- [ ] Motor database import (public thrust curves)
- [ ] Multi-stage / events (deploy) basic
- [ ] Project save/load (local + account later)
- [ ] Richer 3D technical/render modes

## Phase 3 — SaaS shell (PocketBase)

- [x] PocketBase local tooling (`pnpm pb:download|serve|import`) + schema/rules
- [x] Dual-mode DI: memory (default) | pocketbase
- [x] Auth adapters (guest memory / PB sign-in)
- [x] Plan entitlement gates in use cases + specs (unit tested)
- [ ] File storage for PDF/CSV/thrust curves (adapter exists; product flow TBD)
- [ ] Ops admin: PocketBase Admin UI workflow verified on fresh Mac
- [ ] Cloud host PocketBase (Render/Fly)

## Phase 4 — Pro physics & desktop

- [ ] HPR / sounding model packs
- [ ] Advanced numerics modules (user-selectable)
- [ ] Optimization hooks (parameter sweep / Monte Carlo)
- [ ] Desktop shell (Tauri) sharing sim-core
- [ ] macOS + Windows installers (signed later)

## Phase 5 — Sensor protocol & community

- [ ] Secure telemetry ingest protocol (v1)
- [ ] Classification + replay against sim
- [ ] “Request a calculation” issue type → module pipeline
- [ ] i18n expansion (8–10 locales)
- [ ] Public API docs for device makers

## Open questions (tracked)

1. Final product name / domain
2. Payment provider (Stripe etc.)
3. Auth provider vs pure Workers
4. Whether any OpenRocket format import lands in Phase 2 or 3
5. Legal review before any GPL-derived code path
