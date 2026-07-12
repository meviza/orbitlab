# OrbitLab Web (`@orbitlab/web`)

Presentation layer for OrbitLab: dark enterprise UI, design editor shell, local sim runner, and Clean Architecture composition root.

Features call **injected use cases / ports** only — not PocketBase directly.

## Stack

- Vite + React + TypeScript
- CSS variables (dark theme `#0b0f14`, cyan/copper accents)
- Workspace packages: `@orbitlab/domain`, `@orbitlab/application`, `@orbitlab/sim-core`

## Run from monorepo root

```bash
# from orbitlab/
pnpm install
pnpm --filter @orbitlab/sim-core build   # if sim-core dist is missing
pnpm --filter @orbitlab/web dev
# or root script:
pnpm dev
```

Then open the URL Vite prints (default `http://localhost:5173`).

### Other scripts

```bash
pnpm --filter @orbitlab/web build
pnpm --filter @orbitlab/web preview
pnpm --filter @orbitlab/web typecheck
```

### From this package

```bash
cd apps/web
pnpm dev
pnpm build
pnpm preview
```

## Architecture (src)

```
src/
  app/           # App shell, hash router, providers, di.ts (composition root)
  pages/         # Home · Editor · Sim
  features/      # design-editor · sim-runner · auth
  shared/        # ui primitives, i18n (TR/EN), global.css
  adapters/      # in-memory ports + LocalSimulationRunner (sim-core)
```

### DI (`src/app/di.ts`)

| Binding | Implementation |
|---------|----------------|
| `DesignRepository` | `InMemoryDesignRepository` |
| `SimRunRepository` | `InMemorySimRunRepository` |
| `AuthPort` | `GuestAuthAdapter` (offline guest) |
| `SimulationRunnerPort` | `LocalSimulationRunner` → `createDefaultPipeline()` |
| Use cases | `SaveDesignUseCase`, `ListDesignsUseCase`, `RunSimulationUseCase` from `@orbitlab/application` |

Swap in-memory adapters for `@orbitlab/infrastructure` PocketBase implementations in `di.ts` when the backend is ready.

## Hosting

Target: **Netlify**. Build command: `pnpm --filter @orbitlab/web build`, publish `apps/web/dist`.

## Status

Phase 1 scaffold: offline demo (memory designs + free sim modules). 3D viewport is a placeholder until Three.js.
