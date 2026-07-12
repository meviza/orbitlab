import {
  type SimRun,
  type SimRunRepository,
  DomainError,
  ok,
  err,
  type Result,
} from "@orbitlab/domain";

/** Offline demo sim-run store. */
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
    const list = [...this.store.values()].filter((r) => r.designId === designId);
    return ok(list);
  }

  async require(id: string): Promise<Result<SimRun, DomainError>> {
    const run = this.store.get(id);
    if (!run) return err(DomainError.notFound("SimRun", id));
    return ok(run);
  }
}
