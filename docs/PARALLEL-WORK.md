# Parallel agent workflow (quality-first)

OrbitLab uses parallel subagents for independent layers. The orchestrator always **integrates and verifies** before merge.

## Rules

1. **Non-overlapping paths** — each agent owns a package/app tree or single feature folder only.
2. **Dependency rule** — domain never imports outward; agents must not invert layers.
3. **Default offline** — web `memory` backend must keep working without PocketBase.
4. **Verify gate** — `pnpm typecheck && pnpm test && pnpm --filter @orbitlab/web build` before push.
5. **No secret commits** — `.env` local only; examples use placeholders.
6. **Hub files are orchestrator-only** during multi-agent waves: `di.ts`, `factory.ts`, root lockfile, ROADMAP.

## Typical small wave (4 agents)

| Track | Owner path | Output |
|-------|------------|--------|
| A | `apps/pocketbase` | local BaaS tooling |
| B | `apps/web/src/features/<one>` | one feature only |
| C | `packages/sim-core/src/modules/<one>` | one physics module |
| D | `packages/domain` **or** `application` tests | pure unit tests |

## Large wave (up to 16)

Full exclusive-lane plan: **[PLAN-16-AGENTS.md](./PLAN-16-AGENTS.md)**.

Summary: 16 concurrent agents **can** run if and only if write scopes do not intersect. Quality is gated by post-wave integration, not by “more agents = better.”

## After agents finish

Orchestrator:

1. Resolve API mismatches (Result ports, use case deps, factory registration)
2. Wire hub files (`di.ts`, pages, `factory.ts`)
3. Run full monorepo verify
4. Fix cross-cutting docs (README, ROADMAP)
5. Single coherent commit (or small stack)
