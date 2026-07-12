# `@orbitlab/sim-core`

Physics and numerics engine for OrbitLab.

- Pure TypeScript (ESM) — runs in Node, Web Workers, and (later) desktop
- Zero React / PocketBase dependencies
- Strategy modules + registry + pipeline + factory + progress observer

## Architecture

| Pattern | Type |
|---------|------|
| Strategy | `CalcModule` |
| Registry | `ModuleRegistry` |
| Pipeline | `SimulationPipeline` |
| Factory | `createDefaultRegistry()`, `createDefaultPipeline()` |
| Observer | `SimProgressListener` |
| Facade | `SimulationRunner` |

Every module returns `{ moduleId, data, steps[], series? }` with **references** (papers/textbooks — never GPL OpenRocket code) and exam-style **equation steps** (LaTeX + prose) for the report engine.

## Built-in modules (free)

| id | Description | Notes |
|----|-------------|-------|
| `mass.properties` | Resolve total mass from design / components | Constant-mass assumption for free tier |
| `stability.margin-lite` | Educational CP/CG static margin | **Not** full Barrowman — documented approximations |
| `aero.simple-drag` | Quadratic drag force at a velocity sample | \(D = \tfrac12\rho v^2 C_D A\) |
| `flight.toy-vertical` | 1D vertical flight (Euler or RK4) + drag | Uses mass from `mass.properties` when present |

### Module id sets

```ts
// Fast interactive demo (default)
DEFAULT_FREE_MODULE_IDS = [
  'mass.properties',
  'flight.toy-vertical',
]

// Full free educational suite
FULL_FREE_MODULE_IDS = [
  'mass.properties',
  'stability.margin-lite',
  'aero.simple-drag',
  'flight.toy-vertical',
]
```

## Patterns

### Strategy (`CalcModule`)

```ts
interface CalcModule<I, O> {
  id: string;
  title: { en: string; tr: string };
  tier: 'free' | 'pro';
  references: string[];
  run(input: I, ctx: SimContext): ModuleResult<O>;
}
```

- Deterministic, pure (no network I/O), SI at the edges
- Read earlier results via `ctx.previous.get(moduleId)`
- Optional progress via `ctx.emit`

### Pipeline + Factory

1. `createDefaultRegistry()` registers built-in modules  
2. `SimulationPipeline` runs an ordered `moduleIds` list  
3. `SimulationRunner` is the app-facing facade (config merge + `byId` map)

### Design snapshot extras

Optional fields on `RocketDesignSnapshot` for the new modules:

| Field | Used by |
|-------|---------|
| `components[].kind` / `stationM` / `lengthM` / fin geometry | `stability.margin-lite` |
| `lengthM`, `diameterM`, `cgFromNoseM` | `stability.margin-lite` |
| `velocitySampleMs`, `rhoKgM3` | `aero.simple-drag` |

## Usage

```ts
import {
  SimulationRunner,
  DEFAULT_FREE_MODULE_IDS,
  FULL_FREE_MODULE_IDS,
} from '@orbitlab/sim-core';

const runner = new SimulationRunner();

// Fast default
const quick = runner.run(
  {
    massKg: 0.5,
    cd: 0.45,
    areaM2: 0.005,
    thrustN: 20,
    burnTimeS: 1.5,
  },
  [...DEFAULT_FREE_MODULE_IDS]
);

// Full free suite
const full = runner.run(
  {
    massKg: 0.5,
    cd: 0.45,
    areaM2: 0.005,
    thrustN: 20,
    burnTimeS: 1.5,
    lengthM: 0.5,
    diameterM: 0.025,
    velocitySampleMs: 50,
    components: [
      { id: 'nose', kind: 'nose', massKg: 0.1, stationM: 0, lengthM: 0.08, diameterM: 0.025 },
      { id: 'body', kind: 'body', massKg: 0.3, stationM: 0.08, lengthM: 0.35, diameterM: 0.025 },
      {
        id: 'fins',
        kind: 'fin',
        massKg: 0.1,
        stationM: 0.4,
        rootChordM: 0.06,
        tipChordM: 0.03,
        spanM: 0.04,
        finCount: 3,
      },
    ],
  },
  [...FULL_FREE_MODULE_IDS]
);

const flight = full.byId['flight.toy-vertical'];
const margin = full.byId['stability.margin-lite'];
const drag = full.byId['aero.simple-drag'];
console.log(flight?.data, margin?.data, drag?.data);
```

## Quality bar

- Pure TS — no React
- Every module has `references[]` and `steps[]`
- Golden / analytic unit tests via `tsx --test`
- No GPL OpenRocket source pasted into modules

## Scripts

```bash
# from repo root
pnpm --filter @orbitlab/sim-core install
pnpm --filter @orbitlab/sim-core test
pnpm --filter @orbitlab/sim-core typecheck
pnpm --filter @orbitlab/sim-core build
```

Or from this package:

```bash
pnpm install
pnpm test
pnpm typecheck
pnpm build
```

See [docs/ARCHITECTURE.md](../../docs/ARCHITECTURE.md) and [docs/MATH.md](../../docs/MATH.md).
