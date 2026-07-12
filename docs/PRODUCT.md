# OrbitLab — Product brief

Last updated: 2026-07-12

## Problem

Students and hobbyists need rocket design tools that are:

1. **Accessible** — browser-first, no heavy desktop install required for class.
2. **Visual** — interactive 3D, not only tables.
3. **Transparent** — show the math (fluids, ballistics, numerics) like a worked exam solution.
4. **Extensible** — from model rockets to high-power / sounding class with paid depth.
5. **Connected** — optional sensor/telemetry for pro users, with strong security.

OpenRocket set the bar for desktop model-rocket design. OrbitLab aims for **web-native UX**, **educational reports**, **SaaS entitlements**, and **optional offline desktop**.

## Audience

| Segment | Needs |
|---------|--------|
| University students | Coursework, labs, exportable step-by-step solutions |
| Hobby developers | Design → simulate → iterate before building |
| Entry / pro amateur | HPR & sounding models, telemetry, optimization |
| Instructors / clubs | Shared projects, edu discount, admin later |

## Product pillars

1. **3D builder** — technical + render modes; drag-and-drop components (nose, body, fins, motor, recovery…).
2. **Simulation is non-negotiable** — trajectories, forces, stability; animated playback + charts.
3. **Math transparency** — optional reports with assumptions, units, formulas, intermediate steps → **PDF + CSV**.
4. **Tiered physics** — free: model-rocket class; paid: advanced DE/numeric suites, HPR/sounding.
5. **Data paths** — free: manual entry; paid: authenticated sensor ingest + classification protocol.
6. **Multi-surface** — web (SaaS) + downloadable macOS/Windows for local work.
7. **Community physics** — “request a calculation module”; maintainers implement after review.
8. **i18n** — TR + EN day one; path to 8–10 locales.
9. **Admin** — members, plans, feature flags, abuse controls.

## Monetization

| Plan | Includes |
|------|----------|
| **Free** | Core builder, basic sim, manual inputs, optional short report, TR/EN |
| **Pro** | Advanced math packs, HPR/sounding models, full reports, sensor protocol, optimization hooks |
| **Edu** | Pro (or subset) at **~50%** with email/domain verification (`.edu` / university mail OK) |

Payments unlock entitlements on the account; desktop can license against the same account later.

## Non-goals (MVP)

- Full CFD / multiphysics FEA
- Certified flight approval or range safety automation
- Live hardware control of motors/igniters (safety)
- Shipping GPL OpenRocket binaries rebranded as OrbitLab

## Success metrics (early)

- Time-to-first-sim under 5 minutes for a student
- Sim + charts + optional PDF on one happy path
- ≥1 public contribution path (issue template for “new calculation”)
- Deployed staging URL on Netlify
