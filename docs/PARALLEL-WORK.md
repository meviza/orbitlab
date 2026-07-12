# Parallel agent workflow (quality-first)

OrbitLab uses parallel subagents for independent layers. The orchestrator always **integrates and verifies** before merge.

## Rules

1. **Non-overlapping paths** — each agent owns a package/app tree only.
2. **Dependency rule** — domain never imports outward; agents must not invert layers.
3. **Default offline** — web `memory` backend must keep working without PocketBase.
4. **Verify gate** — `pnpm typecheck && pnpm test && pnpm --filter @orbitlab/web build` before push.
5. **No secret commits** — `.env` local only; examples use placeholders.

## Typical parallel split

| Track | Owner path | Output |
|-------|------------|--------|
| A | `apps/pocketbase` | local BaaS tooling |
| B | `apps/web` | presentation + DI |
| C | `packages/sim-core` | physics modules + golden tests |
| D | `packages/domain` + `application` | pure unit tests |
| E | `packages/infrastructure` | PB adapters only when schema stable |

## After agents finish

Orchestrator:

1. Resolve API mismatches (Result ports, use case deps)
2. Run full monorepo verify
3. Fix cross-cutting docs (README, ROADMAP)
4. Single coherent commit (or small stack)
