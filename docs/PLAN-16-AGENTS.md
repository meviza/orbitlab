# 16 parallel agents — OrbitLab plan (conflict-free)

**Status:** planning + concurrency smoke design  
**Orchestrator:** main session (you + Grok) — never parallel with itself on the same files  
**Question:** Can 16 agents run at once without quality collapse?  
**Answer:** **Yes, only if each agent owns exclusive paths and never touches shared “hub” files.**

---

## 1. Hard limits (honest)

| Topic | Reality |
|--------|---------|
| Tooling | Multiple `spawn_subagent` calls can run **in parallel** (background). |
| “Exactly 16?” | Not a guaranteed product constant — depends on session/runtime caps. Treat **16 as a design target**, not a SLA. |
| Quality bottleneck | **Not CPU** — **merge conflicts + inverted deps + dual edits of `di.ts` / `DesignEditorPanel` / `factory.ts`**. |
| Orchestrator | After all 16 finish: one human-in-loop (or main agent) runs **integrate → typecheck → test → build → push**. |

If the platform rejects or throttles some spawns, drop lowest-priority lanes (see §5) first — never merge partial broken trees.

---

## 2. Golden rules (non-negotiable)

1. **Exclusive write paths** — listed below. No agent may edit another agent’s path.
2. **Read-only shared** — agents may *read* any file; only *write* their strip.
3. **Forbidden multi-writer hubs** (orchestrator-only after wave):
   - `apps/web/src/app/di.ts`
   - `apps/web/src/app/providers.tsx`
   - `apps/web/src/app/router.tsx`
   - `packages/sim-core/src/factory.ts` / `index.ts` (registry exports)
   - Root `package.json`, `pnpm-lock.yaml`, `README.md`, `docs/ROADMAP.md` (orchestrator)
4. **API contracts freeze** before wave:
   - Domain entities / ports
   - `CalcModule` interface
   - Use-case command/DTO shapes  
   Agents **extend**; they do not rename public APIs mid-wave.
5. **Default offline** — `VITE_DATA_BACKEND=memory` demo must still build.
6. **No GPL dumps** — OpenRocket only as reference in docs/comments.
7. **Done definition per agent:** typecheck/tests for *their* package if applicable; list of files written.

---

## 3. Path isolation model

```
                    ORCHESTRATOR (after)
                           │
     ┌─────────┬───────────┼───────────┬─────────┐
     │         │           │           │         │
  domain    application  sim-core*  report    infra
  tests      use-cases    modules     PDF      PB cloud
     │         │           │           │         │
     └──── web features (each feature folder exclusive) ────┘
                           │
                      desktop / pb / ci docs
```

\*sim-core: **one module file per agent** under `modules/`; only orchestrator updates `factory.ts`.

\*web: **one feature folder per agent** under `features/`; orchestrator wires imports into pages/di.

---

## 4. The 16 lanes (next product wave)

Designed for **Phase 2–4** work still open. Each lane: ID, sole write roots, deliverable, depends-on (read-only).

### Physics / sim-core (agents 1–4) — write only new module files + their tests

| # | Agent | Exclusive paths | Deliverable |
|---|--------|-----------------|-------------|
| **01** | Motor curves | `packages/sim-core/src/modules/motor-thrust-curve.ts` + `*.test.ts` | Interp. thrust curve module `motor.thrust-curve` |
| **02** | Atmosphere | `packages/sim-core/src/modules/atmosphere-isa.ts` + test | ISA atmosphere `aero.atmosphere-isa` |
| **03** | Recovery event | `packages/sim-core/src/modules/recovery-deploy.ts` + test | Deploy event `recovery.deploy-simple` |
| **04** | Wind model | `packages/sim-core/src/modules/wind-constant.ts` + test | Constant wind `aero.wind-constant` (free or pro-flag in module.tier) |

**Orchestrator after 01–04:** register modules in `factory.ts`, extend `FULL_FREE_MODULE_IDS` / pro lists.

### Application / domain (agents 5–6)

| # | Agent | Exclusive paths | Deliverable |
|---|--------|-----------------|-------------|
| **05** | Domain VO/geometry | `packages/domain/src/value-objects/geometry.ts` + test; **no** entity renames | Length/diameter VOs if missing; tests only |
| **06** | Use case: import motor | `packages/application/src/use-cases/import-thrust-curve.ts` + test + dto file under `dto/thrust-curve-dto.ts` | Import CSV thrust table use case (ports only) |

### Report (agent 7)

| # | Agent | Exclusive paths | Deliverable |
|---|--------|-----------------|-------------|
| **07** | Report charts text | `packages/report/src/sparkline.ts` + test; may edit `build-report.ts` **only if sole report writer** | ASCII/SVG sparkline snippet in markdown |

*(If 07 conflicts with prior report work: only new files under `packages/report/src/extensions/`.)*

### Infrastructure / PocketBase (agents 8–9)

| # | Agent | Exclusive paths | Deliverable |
|---|--------|-----------------|-------------|
| **08** | PB cloud docs | `apps/pocketbase/docs/CLOUD-HOST.md` + `apps/pocketbase/scripts/render-blueprint.md` | Render/Fly host recipe (no secrets) |
| **09** | File upload flow notes + adapter test stub | `packages/infrastructure/src/pocketbase/repositories/PocketBaseReportStorage.ts` (new) | Report file upload adapter stub implementing FileStoragePort path convention |

### Web features (agents 10–13) — exclusive feature folders

| # | Agent | Exclusive paths | Deliverable |
|---|--------|-----------------|-------------|
| **10** | Motor library UI | `apps/web/src/features/motor-library/**` | List/import thrust CSV UI (calls use case via props/callback stubs if di not ready) |
| **11** | Wireframe toggle UX | `apps/web/src/features/viewport-3d/WireframeToggle.tsx` + styles file in same folder | Toggle control component only (parent wires later) |
| **12** | Sim module picker | `apps/web/src/features/sim-runner/ModuleChipBar.tsx` | Extract chips into presentational component |
| **13** | i18n pack ES | `apps/web/src/shared/i18n/locales/es.ts` (new) | Spanish strings map (not messages.ts if contested — orchestrator merges) |

**Orchestrator after 10–13:** import into Editor/Sim pages + di; merge es into messages or locale loader.

### Desktop / ops (agents 14–16)

| # | Agent | Exclusive paths | Deliverable |
|---|--------|-----------------|-------------|
| **14** | Desktop offline note | `apps/desktop/docs/OFFLINE.md` | Offline memory mode checklist |
| **15** | CI matrix doc | `.github/workflows/ci-optional-desktop.yml` **or** `docs/CI-DESKTOP.md` | Optional desktop CI notes (don’t break main ci.yml without care — prefer docs only) |
| **16** | E2E checklist | `docs/E2E-MANUAL.md` | Manual QA script (PB + Netlify + sim + report) |

---

## 5. Priority if runtime < 16

Drop in reverse order: **16 → 15 → 14 → 13 → 11 → 07** first.  
Keep **01–04 + 06 + 10** if product value matters most.

---

## 6. Wave protocol

```
T0  Orchestrator freezes contracts; opens branch or clean main
T1  Spawn A01…A16 with exclusive paths in prompt (copy table row)
T2  Agents run (background); no cross-talk
T3  Collect 16 completion reports
T4  Orchestrator:
      - merge factory + di + pages
      - pnpm typecheck && pnpm test && pnpm --filter @orbitlab/web build
      - fix conflicts
      - single commit / PR
T5  Optional: Netlify redeploy memory demo
```

### Prompt template (each agent)

```
Scope ONLY: <paths>
Forbidden: di.ts, factory.ts, pnpm-lock, other agents' paths
Contract: CalcModule / Result / existing DTOs
Done: list files + how to test your strip
```

---

## 7. Concurrency smoke test (proves “16 at once”)

Before a full product wave, run **16 micro-agents** that each write:

`docs/parallel-smoke/agent-NN.md` with one line: `ok agent NN`

Then orchestrator asserts 16 files exist.  
This validates **spawn parallelism** without repo risk.

---

## 8. Anti-patterns (why past waves hurt)

| Bad | Good |
|-----|------|
| Two agents edit `DesignEditorPanel.tsx` | One feature folder each + orchestrator compose |
| Agent “fixes” lockfile | Orchestrator only `pnpm install` |
| Agent renames `PlanTier` | New field / new module only |
| Agent starts PocketBase with secrets in git | Local only, gitignore |

---

## 9. Relation to roadmap

Maps to open Phase 2–5 items: motors, atmosphere/wind, recovery, cloud PB, i18n, desktop polish, E2E.

See also: [PARALLEL-WORK.md](./PARALLEL-WORK.md), [ROADMAP.md](./ROADMAP.md).

---

## 10. Decision for human

| Option | Meaning |
|--------|---------|
| **A. Smoke only** | 16 micro-agents → prove concurrency |
| **B. Full wave** | Product 16 lanes above (longer; orchestrator merge heavy) |
| **C. Half wave** | 8 lanes: 01–04 + 06 + 10 + 08 + 16 |

Recommended: **A then B** (smoke → product wave).
