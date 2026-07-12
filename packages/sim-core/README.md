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

## Built-in modules (free)

| id | Description |
|----|-------------|
| `mass.properties` | Resolve total mass from design / components |
| `flight.toy-vertical` | 1D vertical flight (Euler or RK4) + drag |

## Usage

```ts
import { SimulationRunner, DEFAULT_FREE_MODULE_IDS } from '@orbitlab/sim-core';

const runner = new SimulationRunner();
const result = runner.run(
  {
    massKg: 0.5,
    cd: 0.45,
    areaM2: 0.005,
    thrustN: 20,
    burnTimeS: 1.5,
  },
  [...DEFAULT_FREE_MODULE_IDS]
);

const flight = result.byId['flight.toy-vertical'];
console.log(flight?.data);
```

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
