import type { SimRun } from "../entities/sim-run.js";
import type { DomainError } from "../shared/errors.js";
import type { Result } from "../shared/result.js";

export interface SimRunRepository {
  save(run: SimRun): Promise<Result<SimRun, DomainError>>;
  findById(id: string): Promise<Result<SimRun | null, DomainError>>;
  listByDesign(designId: string): Promise<Result<SimRun[], DomainError>>;
}
