/**
 * Minimal in-memory fakes for application-layer unit tests.
 * Not production adapters — keep them local to the test surface.
 */
import {
  type AuthPort,
  type ClockPort,
  type DesignRepository,
  type EntitlementPort,
  type IdGeneratorPort,
  type RocketDesign,
  type SimRun,
  type SimRunRepository,
  type User,
  type PlanTier,
  type CalcModuleId,
  DomainError,
  ok,
  err,
  type Result,
  tierMeetsRequirement,
} from "@orbitlab/domain";
import type {
  ModuleTierLookup,
  SimulationRunnerPort,
} from "../ports/simulation-runner-port.js";
import type {
  SimProgressEvent,
  SimRunResultDto,
} from "../dto/sim-run-dto.js";

export class InMemoryDesignRepository implements DesignRepository {
  private readonly store = new Map<string, RocketDesign>();

  constructor(seed: readonly RocketDesign[] = []) {
    for (const design of seed) {
      this.store.set(design.id, design);
    }
  }

  async save(
    design: RocketDesign
  ): Promise<Result<RocketDesign, DomainError>> {
    this.store.set(design.id, design);
    return ok(design);
  }

  async findById(
    id: string
  ): Promise<Result<RocketDesign | null, DomainError>> {
    return ok(this.store.get(id) ?? null);
  }

  async listByOwner(
    ownerId: string
  ): Promise<Result<RocketDesign[], DomainError>> {
    return ok([...this.store.values()].filter((d) => d.ownerId === ownerId));
  }

  async delete(id: string): Promise<Result<void, DomainError>> {
    if (!this.store.has(id)) {
      return err(DomainError.notFound("Design", id));
    }
    this.store.delete(id);
    return ok(undefined);
  }

  all(): RocketDesign[] {
    return [...this.store.values()];
  }
}

export class InMemorySimRunRepository implements SimRunRepository {
  private readonly store = new Map<string, SimRun>();

  async save(run: SimRun): Promise<Result<SimRun, DomainError>> {
    this.store.set(run.id, run);
    return ok(run);
  }

  async findById(id: string): Promise<Result<SimRun | null, DomainError>> {
    return ok(this.store.get(id) ?? null);
  }

  async listByDesign(
    designId: string
  ): Promise<Result<SimRun[], DomainError>> {
    return ok(
      [...this.store.values()].filter((r) => r.designId === designId)
    );
  }

  all(): SimRun[] {
    return [...this.store.values()];
  }
}

export class FakeAuthPort implements AuthPort {
  constructor(private user: User | null) {}

  setUser(user: User | null): void {
    this.user = user;
  }

  async currentUser(): Promise<Result<User | null, DomainError>> {
    return ok(this.user);
  }

  async signIn(): Promise<Result<User, DomainError>> {
    if (!this.user) {
      return err(DomainError.unauthorized());
    }
    return ok(this.user);
  }

  async signUp(): Promise<Result<User, DomainError>> {
    if (!this.user) {
      return err(DomainError.unauthorized());
    }
    return ok(this.user);
  }

  async signOut(): Promise<Result<void, DomainError>> {
    this.user = null;
    return ok(undefined);
  }
}

export class SequentialIdGenerator implements IdGeneratorPort {
  private n = 0;

  constructor(private readonly prefix = "id") {}

  nextId(): string {
    this.n += 1;
    return `${this.prefix}-${this.n}`;
  }
}

export class FixedClock implements ClockPort {
  constructor(private readonly instant: Date) {}

  now(): Date {
    return this.instant;
  }
}

/** Entitlements driven purely by plan tier rank. */
export class PlanEntitlements implements EntitlementPort {
  canUseModule(
    user: User,
    _moduleId: CalcModuleId,
    tierRequired: PlanTier
  ): boolean {
    return tierMeetsRequirement(user.plan, tierRequired);
  }
}

/** Static module → tier map for tests (no sim-core dependency). */
export class MapModuleTierLookup implements ModuleTierLookup {
  constructor(
    private readonly tiers: Readonly<Record<string, PlanTier>> = {}
  ) {}

  requiredTier(moduleId: string): PlanTier {
    return this.tiers[moduleId] ?? "free";
  }
}

export class FakeSimulationRunner implements SimulationRunnerPort {
  readonly calls: Array<{
    designId: string;
    moduleIds: readonly string[];
  }> = [];

  constructor(
    private readonly resultFactory?: (
      design: RocketDesign,
      moduleIds: readonly string[]
    ) => SimRunResultDto
  ) {}

  async run(
    design: RocketDesign,
    moduleIds: readonly string[],
    _onProgress?: (event: SimProgressEvent) => void
  ): Promise<SimRunResultDto> {
    this.calls.push({ designId: design.id, moduleIds: [...moduleIds] });

    if (this.resultFactory) {
      return this.resultFactory(design, moduleIds);
    }

    return {
      id: "runner-placeholder",
      designId: design.id,
      moduleIds: [...moduleIds],
      status: "completed",
      summary: { apogeeM: 120, flightTimeS: 8 },
      createdAt: new Date(0).toISOString(),
      samples: [{ t: 0, altitude: 0 }],
      moduleOutputs: { "mass-properties": { totalMassKg: 0.5 } },
    };
  }
}
