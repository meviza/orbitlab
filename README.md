# OrbitLab

**Web-first 3D rocket design, simulation, and education platform.**

OrbitLab targets university students, hobby rocketeers, and early-career professionals. It combines an interactive 3D builder, physics-backed simulation, step-by-step mathematical reports (CSV/PDF), and a SaaS layer for advanced models, sensor telemetry, and team/admin tools.

> Status: **foundation** — product decisions locked, architecture sketched, implementation starting. Contributors welcome.

## Vision

| Layer | What |
|--------|------|
| **Free** | Model-rocket class design + simulation, dark UI, 3D drag-and-drop editor, manual data entry, optional math report export |
| **Pro / paid** | High-power & sounding rocket models, advanced numerics (ODE/PDE, integration, limits, derivatives), live-ish sensor protocol, optimization |
| **Desktop** | macOS + Windows downloadable apps for offline / lab use (same engine as web) |
| **Community** | Request new calculation modules; maintainers review and ship |
| **i18n** | TR + EN first; expand toward 8–10 locales |
| **Ops** | SaaS accounts, entitlements, admin; web on **Netlify**; data/auth/files on **PocketBase** (self-hosted) |

Inspired by [OpenRocket](https://openrocket.info/) (open-source model rocket simulator). We treat OpenRocket as a **reference for models, UX, and data formats** — not as a drop-in copy. See [docs/LICENSING.md](docs/LICENSING.md).

## Monorepo layout (planned)

```
orbitlab/
├── apps/
│   ├── web/                 # Presentation (Vite + React) — composition root
│   └── pocketbase/          # pb_schema.json, API rules, seed notes
├── packages/
│   ├── domain/              # Entities, VOs, ports, specifications
│   ├── application/         # Use cases (SaveDesign, RunSimulation, …)
│   ├── infrastructure/      # PocketBase repositories, mappers, auth
│   ├── sim-core/            # Calc Strategy / Registry / Pipeline
│   └── schema/              # Shared schema notes
└── docs/
```

## Docs

- [Product brief](docs/PRODUCT.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Clean Architecture & patterns](docs/CLEAN-ARCHITECTURE.md)
- [How advanced math works](docs/MATH.md)
- [Roadmap](docs/ROADMAP.md)
- [Licensing & OpenRocket](docs/LICENSING.md)
- [Contributing](CONTRIBUTING.md)
- [Feature matrix (free vs pro)](docs/FEATURE-MATRIX.md)

## Quick start

```bash
# prerequisites: Node 20+, pnpm 9+
pnpm install
pnpm test
pnpm dev          # web app → http://localhost:5173
pnpm typecheck
```

Default DI uses **in-memory** repositories + local `sim-core` (no PocketBase required for UI demo).
Swap to PocketBase adapters in `apps/web` composition root when the BaaS is running.

## Stack (locked for MVP)

| Concern | Choice |
|---------|--------|
| Web UI | TypeScript, React, dark theme, Three.js / R3F |
| Sim / math | **Module pipeline** in `sim-core` (not in the DB) — see [docs/MATH.md](docs/MATH.md) |
| Auth + DB + files + realtime | **[PocketBase](https://pocketbase.io/)** (SQLite, built-in admin) |
| PocketBase host | Self-host (Render / Fly / VPS) |
| Web host | **Netlify** |
| Desktop later | Tauri preferred (smaller) or Electron |

Supabase is out of scope (account limits). Cloudflare D1 path deferred in favor of PocketBase.

## Contributing

Ideas, physics modules, UI, docs, and tests all help. Start with [CONTRIBUTING.md](CONTRIBUTING.md) and open a Discussion or Issue.

## License

Original OrbitLab code: **Apache License 2.0** — see [LICENSE](LICENSE).

OpenRocket is GPL-3.0; we do **not** ship OpenRocket source in this repository. Reusing OR code requires a separate legal path (see docs/LICENSING.md).

## Disclaimer

Simulation outputs are educational and engineering aids, not flight-safety certification. Always follow applicable safety codes (e.g. NAR/TRA, local law) when building or flying rockets.
