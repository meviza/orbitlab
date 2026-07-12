# Roadmap

Phased so the product ships value early without boiling the ocean.

## Phase 0 — Foundation ✅ (this repo)

- [x] Product decisions documented
- [x] Architecture + licensing notes
- [x] Public GitHub repo
- [x] Contribution / issue templates
- [ ] Project name freeze (OrbitLab working title)

## Phase 1 — Web MVP (target: first usable demo)

- [ ] `apps/web` scaffold (React + dark theme)
- [ ] 3D viewport (placeholder rocket + camera)
- [ ] Component list → simple drag-drop or palette add
- [ ] Manual design params (mass, Cd, motor thrust table minimal)
- [ ] 3DOF vertical / simple ballistic sim in `sim-core`
- [ ] Charts (altitude, velocity vs time)
- [ ] Optional report: short Markdown/PDF + CSV export
- [ ] TR/EN strings baseline
- [ ] Netlify deploy

## Phase 2 — OpenRocket-class depth (free tier)

- [ ] Component library (nose, body tubes, fins, transitions, motors, recovery)
- [ ] Mass properties + stability (Barrowman-class baseline)
- [ ] Motor database import (public thrust curves)
- [ ] Multi-stage / events (deploy) basic
- [ ] Project save/load (local + account later)
- [ ] Richer 3D technical/render modes

## Phase 3 — SaaS shell (PocketBase)

- [ ] PocketBase self-host + collections (users, designs, sim_runs, files)
- [ ] Auth (signup/login) via PocketBase SDK
- [ ] Plans: free / pro / edu verification stub on user record
- [ ] File storage for PDF/CSV/thrust curves
- [ ] Ops admin: PocketBase Admin UI + optional product admin views
- [ ] Entitlement gates in UI (and API rules)

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
