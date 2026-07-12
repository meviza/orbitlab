# Clean Architecture & design patterns

OrbitLab follows **Clean Architecture** (ports & adapters) so UI, PocketBase, and physics engines can change without rewriting business rules.

## Layer diagram

```
┌──────────────────────────────────────────────────────────────┐
│  apps/web  (Presentation)                                    │
│  Pages · components · hooks · composition root (DI)          │
└────────────────────────────┬─────────────────────────────────┘
                             │ depends on ↓
┌────────────────────────────▼─────────────────────────────────┐
│  packages/application  (Use cases / application services)    │
│  RunSimulation · SaveDesign · ExportReport · ListDesigns     │
└────────────────────────────┬─────────────────────────────────┘
                             │ depends on ↓
┌────────────────────────────▼─────────────────────────────────┐
│  packages/domain  (Entities · value objects · ports)         │
│  RocketDesign · SimRun · UserPlan · CalcModuleId             │
│  Ports: DesignRepository · AuthPort · FileStoragePort · …    │
└───────────────┬─────────────────────────────┬────────────────┘
                │                             │
┌───────────────▼──────────────┐  ┌───────────▼────────────────┐
│ packages/sim-core            │  │ packages/infrastructure    │
│ Physics / numerics modules   │  │ PocketBase adapters        │
│ Strategy · Registry ·        │  │ Repository implementations │
│ Pipeline · Memento (state)   │  │ Auth · Files · Realtime    │
└──────────────────────────────┘  └────────────────────────────┘
```

**Dependency rule:** outer layers depend inward. Domain has **zero** imports from React, PocketBase, or Three.js.

## Packages

| Package | Role |
|---------|------|
| `@orbitlab/domain` | Entities, VOs, domain errors, **port interfaces** |
| `@orbitlab/application` | Use cases, DTOs, application services |
| `@orbitlab/sim-core` | Calculation strategies, pipeline, integrators |
| `@orbitlab/infrastructure` | PocketBase client, repositories, mappers |
| `@orbitlab/schema` | Shared Zod/JSON schemas (API boundary) |
| `apps/web` | React presentation + composition root |
| `apps/pocketbase` | Collections schema export, rules, seed notes |

## Design patterns in use

| Pattern | Where | Why |
|---------|--------|-----|
| **Repository** | `DesignRepository`, `SimRunRepository` | Abstract persistence |
| **Port / Adapter** | domain ports ↔ infrastructure | Swap PocketBase later |
| **Use Case / Interactor** | `application/*` | One business action per class |
| **Strategy** | `CalcModule` implementations | Pluggable free/pro math |
| **Registry** | `ModuleRegistry` | Discover modules by id |
| **Pipeline** | `SimulationPipeline` | Ordered module execution |
| **Factory** | `createSimulationPipeline` | Wire default modules |
| **Specification** | plan/entitlement checks | `CanRunProModule` |
| **DTO + Mapper** | infra mappers | Keep PB JSON out of domain |
| **Result / Either** | `Result<T, DomainError>` | Explicit failures |
| **Observer / Event bus** (light) | sim progress callbacks | UI charts without coupling |
| **Composition Root** | `apps/web/src/app/di.ts` | Single place for DI |
| **Facade** | `OrbitLabClient` (optional) | App-facing API surface |

## DB (PocketBase) enterprise shape

- Collections mirror **aggregates**, not UI screens.
- Soft rules: owner-scoped API rules; pro fields never trusted from client alone.
- Mappers convert `RecordModel` → domain entities.
- Migrations: export `pb_schema.json` + documented collection DDL in `apps/pocketbase`.

## FE architecture

```
apps/web/src/
  app/           # routing, providers, di.ts
  pages/         # route-level composition
  features/      # feature folders (design-editor, sim-runner, auth)
  shared/        # ui primitives, i18n, utils
```

Features call **use cases** via injected ports — not PocketBase SDK directly (except auth bootstrap if needed).

## Testing strategy

| Layer | Test style |
|-------|------------|
| domain | pure unit tests |
| application | use cases + fake repositories |
| sim-core | golden trajectories + module unit tests |
| infrastructure | contract tests (optional CI with PocketBase) |
| web | component tests for critical UX |

## Adding a new calculation module

1. Implement `CalcModule` strategy in `sim-core`.
2. Register in `ModuleRegistry` (free or pro).
3. Add golden test + equation steps for report.
4. Gate with `PlanSpecification` if pro.
5. Document in FEATURE-MATRIX / MATH.md.
