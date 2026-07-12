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
| **Ops** | SaaS accounts, entitlements, admin console; deploy web on Netlify; data plane on Cloudflare (D1/R2/Workers) |

Inspired by [OpenRocket](https://openrocket.info/) (open-source model rocket simulator). We treat OpenRocket as a **reference for models, UX, and data formats** — not as a drop-in copy. See [docs/LICENSING.md](docs/LICENSING.md).

## Monorepo layout (planned)

```
orbitlab/
├── apps/
│   ├── web/           # Next.js (or similar) — Netlify
│   └── desktop/       # Tauri/Electron shell (later)
├── packages/
│   ├── sim-core/      # Physics & numerics (TS first; C/WASM later)
│   ├── schema/        # Shared types, rocket model JSON schema
│   └── report/        # Step-by-step math → PDF/CSV
├── docs/              # Product, architecture, roadmap
└── scripts/
```

## Docs

- [Product brief](docs/PRODUCT.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Roadmap](docs/ROADMAP.md)
- [Licensing & OpenRocket](docs/LICENSING.md)
- [Contributing](CONTRIBUTING.md)
- [Feature matrix (free vs pro)](docs/FEATURE-MATRIX.md)

## Quick start (scaffold)

```bash
# prerequisites: Node 20+
cd apps/web
# package manager bootstrap lands in Phase 1
```

This commit ships **documentation + empty package placeholders**. App scaffolding lands in the next PRs.

## Stack (MVP direction)

| Concern | Choice |
|---------|--------|
| Web UI | TypeScript, React, dark theme, Three.js / R3F |
| Sim engine | TypeScript core first → optional C/Rust WASM for heavy jobs |
| Auth + SaaS | Cloudflare Workers + session/JWT; pro entitlements |
| Database | **Cloudflare D1** (SQL) + **R2** (files, reports, thrust curves) |
| Hosting | **Netlify** (web) + Cloudflare Workers (API) |
| Desktop later | Tauri preferred (smaller) or Electron |

Supabase is intentionally out of scope for this project (account limits elsewhere).

## Contributing

Ideas, physics modules, UI, docs, and tests all help. Start with [CONTRIBUTING.md](CONTRIBUTING.md) and open a Discussion or Issue.

## License

Original OrbitLab code: **Apache License 2.0** — see [LICENSE](LICENSE).

OpenRocket is GPL-3.0; we do **not** ship OpenRocket source in this repository. Reusing OR code requires a separate legal path (see docs/LICENSING.md).

## Disclaimer

Simulation outputs are educational and engineering aids, not flight-safety certification. Always follow applicable safety codes (e.g. NAR/TRA, local law) when building or flying rockets.
