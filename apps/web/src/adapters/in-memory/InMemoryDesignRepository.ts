import {
  type DesignRepository,
  type RocketDesign,
  DomainError,
  ok,
  err,
  type Result,
} from "@orbitlab/domain";

/**
 * Offline demo design store.
 * Swap for PocketBaseDesignRepository in di.ts when backend is wired.
 */
export class InMemoryDesignRepository implements DesignRepository {
  private readonly store = new Map<string, RocketDesign>();

  constructor(seed: RocketDesign[] = []) {
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
    const list = [...this.store.values()].filter((d) => d.ownerId === ownerId);
    return ok(list);
  }

  async delete(id: string): Promise<Result<void, DomainError>> {
    if (!this.store.has(id)) {
      return err(DomainError.notFound("Design", id));
    }
    this.store.delete(id);
    return ok(undefined);
  }
}
