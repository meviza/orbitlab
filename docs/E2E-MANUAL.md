# OrbitLab — Manual E2E QA script

**Purpose:** Human pass/fail checklist for the happy paths that unit tests do not cover.  
**Audience:** Maintainer / release smoke before push or demo.  
**Last aligned with:** UI routes `#/home` · `#/editor` · `#/sim`, dual backends MEMORY / POCKETBASE.

**Do not commit secrets.** Use **local admin password** where credentials are needed (see `apps/pocketbase/LOCAL-LOGIN.md` on the machine that owns that file — not this checklist).

---

## How to use

1. Work top to bottom (sections A → F).
2. Mark each item **Pass** `[x]` or **Fail** `[ ]` (or leave unchecked until verified).
3. On fail: note browser, OS, console errors, and whether backend badge was MEMORY or POCKETBASE.
4. Optional: attach screenshots of editor viewport + sim chart + report download.

| Field | Value |
|-------|--------|
| Tester | |
| Date | |
| Browser | |
| OS | |
| Git commit / branch | |
| Overall | ☐ Pass · ☐ Fail |

---

## Prerequisites

| Check | Pass |
|-------|------|
| Node **20+** and **pnpm 9+** installed | ☐ |
| Repo cloned; `pnpm install` succeeded from monorepo root | ☐ |
| (Local PB sections) `pnpm pb:download` already run once | ☐ |
| Network available for Netlify demo (Section A) | ☐ |

---

## A. Netlify demo (MEMORY)

**URL:** https://stirring-figolla-e187f5.netlify.app  
**Expected backend badge:** `MEMORY` (static demo; no PocketBase host)

| # | Step | Expected | Pass |
|---|------|----------|------|
| A1 | Open the demo URL | Home loads without blank screen / hard 404 | ☐ |
| A2 | Inspect header badge | Shows **MEMORY** (cyan-style chip) | ☐ |
| A3 | Home content | Tagline / hero, **Open design editor**, **Run a demo sim**, Guest offline card | ☐ |
| A4 | Nav: **Editor** (or `#/editor`) | Design editor with Components + 3D viewport + Properties | ☐ |
| A5 | Nav: **Simulation** (or `#/sim`) | Simulation page; design selector; Fast / Full free suite; **Run simulation** | ☐ |
| A6 | Hard refresh on `#/editor` or `#/sim` | SPA still loads (Netlify redirect to `index.html`) | ☐ |
| A7 | Toggle **TR** / **EN** in header | Labels switch locale; no crash | ☐ |
| A8 | Guest auth panel (Home) | Shows guest session / free plan — **no** email/password form | ☐ |

**Section A result:** ☐ Pass · ☐ Fail  
**Est. time:** ~3–5 min

---

## B. Local stack: `pnpm dev` + `pb:serve` + login

Run from monorepo root. Two terminals recommended.

### B0. Configure PocketBase mode (once)

In `apps/web/.env` (copy from `.env.example` if missing):

```bash
VITE_DATA_BACKEND=pocketbase
VITE_POCKETBASE_URL=http://127.0.0.1:8090
```

Restart Vite after any env change.

| # | Step | Expected | Pass |
|---|------|----------|------|
| B1 | Terminal 1: `pnpm pb:serve` | PocketBase listens on `http://127.0.0.1:8090` (no crash loop) | ☐ |
| B2 | Terminal 2: `pnpm dev` | Vite web at `http://localhost:5173` (or printed port) | ☐ |
| B3 | Open local web URL | Home loads; header badge **POCKETBASE** | ☐ |
| B4 | Home → Auth panel | Sign-in form (not guest-only); Email + Password | ☐ |
| B5 | Sign in with `kerem_newton@hotmail.com` and **local admin password** | Success message / account row with email · plan; no red error | ☐ |
| B6 | Sign out then sign in again | Session clears and restores cleanly | ☐ |
| B7 | (Optional) Wrong password | Clear error; app stays usable | ☐ |

**Memory-mode control (optional, ~2 min):** set `VITE_DATA_BACKEND=memory`, restart `pnpm dev` → badge **MEMORY**, guest card returns. Restore `pocketbase` for remaining PB checks.

**Section B result:** ☐ Pass · ☐ Fail  
**Est. time:** ~5–8 min (first-time PB download/serve longer)

---

## C. Editor + 3D orbit

**Route:** `#/editor`  
**Backend:** either MEMORY (Netlify or local) or POCKETBASE after login.

| # | Step | Expected | Pass |
|---|------|----------|------|
| C1 | Open Editor | Three columns/cards: **Components**, **3D viewport**, **Properties** | ☐ |
| C2 | Viewport loads | Rocket mesh/stack visible (not stuck on “Loading 3D viewport…”) | ☐ |
| C3 | Orbit — left-drag on canvas | Camera orbits around rocket (OrbitControls) | ☐ |
| C4 | Zoom — scroll / pinch | Zoom in/out without losing the model entirely | ☐ |
| C5 | Pan (right-drag / ctrl-drag if enabled) | View pans or documents control limit; no freeze | ☐ |
| C6 | Toggle catalog parts (e.g. Fins, Transition) | Selection highlight; viewport geometry updates | ☐ |
| C7 | Stack order ↑ / ↓ | Order list reorders; viewport stack updates | ☐ |
| C8 | Edit mass / thrust / burn / Cd / area | Inputs accept numbers | ☐ |
| C9 | **Save design** | Green “Saved” (or equivalent) with design id; list updates | ☐ |
| C10 | **New design** → edit title → Save | New id appears; can re-load from Saved designs list | ☐ |
| C11 | (PB mode) Reload page after save | Saved design still listable when signed in | ☐ |

**Section C result:** ☐ Pass · ☐ Fail  
**Est. time:** ~5–7 min

---

## D. Simulation — Fast vs Full free suite

**Route:** `#/sim`

| Module suite | UI label | Modules (chips) |
|--------------|----------|-----------------|
| **Fast** | Fast | `mass.properties`, `flight.toy-vertical` |
| **Full** | Full free suite | `mass.properties`, `stability.barrowman`, `aero.simple-drag`, `flight.toy-vertical` |

| # | Step | Expected | Pass |
|---|------|----------|------|
| D1 | Open Simulation | Design dropdown populated (seed **Demo Model A** in memory; or saved designs in PB) | ☐ |
| D2 | Select design used in Editor (if saved) | Metadata line shows mass · thrust · burn | ☐ |
| D3 | Suite = **Fast**; confirm chips | Only two module chips as above | ☐ |
| D4 | **Run simulation** | Loading ends; no red error | ☐ |
| D5 | Summary cards | Apogee (m), Max velocity (m/s), Flight time (s) — finite numbers | ☐ |
| D6 | Altitude chart | SVG line chart with altitude vs time | ☐ |
| D7 | Samples table | Rows of t / h / v | ☐ |
| D8 | Suite = **Full free suite**; confirm four chips | Module chips match Full list | ☐ |
| D9 | Run again | Completes; summary + chart refresh | ☐ |
| D10 | Compare Fast vs Full | Full may differ slightly or add module work; both produce flight metrics | ☐ |
| D11 | Switch suite while running | Controls disabled or run finishes cleanly (no stuck “Running…”) | ☐ |

**Section D result:** ☐ Pass · ☐ Fail  
**Est. time:** ~4–6 min

---

## E. Report export — CSV / Markdown / HTML / print

**Prerequisite:** Successful sim run (Section D) so **Report preview** card is active.

| # | Step | Expected | Pass |
|---|------|----------|------|
| E1 | Report preview card appears | Title · timestamp line, or expandable report | ☐ |
| E2 | **Show report** | Markdown preview with steps / summary content | ☐ |
| E3 | **Download CSV** | Browser downloads `*.csv`; opens in text editor with columns/rows | ☐ |
| E4 | **Download Markdown** | `*.md` downloads; readable headings / content | ☐ |
| E5 | **Download HTML (print/PDF)** | `*.html` downloads; opens in browser with readable report | ☐ |
| E6 | **Print report** | New window (or HTML download if popup blocked) and print dialog, or printable page | ☐ |
| E7 | Hide report | Preview collapses without clearing exports | ☐ |
| E8 | Re-run sim then re-export | New report builds; downloads still work | ☐ |

**Section E result:** ☐ Pass · ☐ Fail  
**Est. time:** ~3–5 min

---

## F. PocketBase admin UI (`/_/`)

**URL:** http://127.0.0.1:8090/_/  
**Requires:** `pnpm pb:serve` running (Section B).

> Admin dashboard uses **\_superusers**. App login uses **users**. Same email may exist on both on this machine — still treat passwords as **local admin password**, not something to paste into git.

| # | Step | Expected | Pass |
|---|------|----------|------|
| F1 | Open `http://127.0.0.1:8090/_/` | Admin login page (not connection refused) | ☐ |
| F2 | Sign in with superuser email (e.g. `kerem_newton@hotmail.com`) + **local admin password** | Dashboard loads | ☐ |
| F3 | Collections list | Expected collections present (e.g. `users`, `designs`, `sim_runs`, …) | ☐ |
| F4 | Open **users** | App user row for the tester email exists (or can be inspected) | ☐ |
| F5 | Open **designs** (after PB-mode save in C) | At least one design record for the signed-in owner | ☐ |
| F6 | API rules / collection fields (spot check) | Schema matches `apps/pocketbase/pb_schema.json` intent (no empty accidental wipe) | ☐ |
| F7 | Sign out of admin | Returns to admin login; app session may remain independent | ☐ |

**Section F result:** ☐ Pass · ☐ Fail  
**Est. time:** ~4–6 min

---

## Quick smoke (minimal)

If time-boxed, run only:

1. **A1–A5** (Netlify MEMORY)  
2. **B1–B5** (local PB login)  
3. **C2–C3, C9** (viewport + save)  
4. **D3–D5, D8–D9** (Fast + Full)  
5. **E3–E6** (exports + print)  
6. **F1–F2** (admin reachable)

**Minimal smoke est.:** ~15–20 min

---

## Failure notes

| Section | Symptom | What to check |
|---------|---------|----------------|
| A | 404 on refresh | Netlify SPA redirect in `netlify.toml` |
| B | Badge stays MEMORY | `apps/web/.env` + restart Vite; Vite only reads `VITE_*` at start |
| B | Auth errors | `pb:serve` up; CORS/local URL; user exists in **users** collection |
| C | Black viewport | WebGL / Three.js console errors; GPU block |
| D | Empty designs | Save in Editor first; MEMORY has seed `demo_model_a` |
| E | Buttons disabled | Wait for report build after run; re-run sim |
| F | Connection refused | `pnpm pb:serve`; port 8090 free |

---

## Time estimate (full pass)

| Section | Minutes (approx.) |
|---------|-------------------|
| A Netlify MEMORY | 4 |
| B Local dev + PB login | 7 |
| C Editor + 3D orbit | 6 |
| D Sim Fast vs Full | 5 |
| E Report CSV/MD/HTML/print | 4 |
| F PocketBase admin `/_/` | 5 |
| Buffer / re-runs / notes | 5–9 |
| **Total full pass** | **~35–40 minutes** |

- **First-time machine** (download PB, schema import, env setup): add **10–15 min**.  
- **Minimal smoke** (table above): **~15–20 minutes**.  
- **Netlify-only** (Section A): **~5 minutes**.

---

## Sign-off

| | |
|--|--|
| Full pass completed | ☐ Yes · ☐ No |
| Blocking failures | |
| Non-blocking notes | |
| Ready to demo / ship static MEMORY | ☐ |
| Ready to demo local POCKETBASE | ☐ |
| Tester signature / handle | |
| Date | |
