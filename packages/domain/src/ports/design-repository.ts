import type { RocketDesign } from "../entities/rocket-design.js";
import type { DomainError } from "../shared/errors.js";
import type { Result } from "../shared/result.js";

export interface DesignRepository {
  save(design: RocketDesign): Promise<Result<RocketDesign, DomainError>>;
  findById(id: string): Promise<Result<RocketDesign | null, DomainError>>;
  listByOwner(ownerId: string): Promise<Result<RocketDesign[], DomainError>>;
  delete(id: string): Promise<Result<void, DomainError>>;
}
