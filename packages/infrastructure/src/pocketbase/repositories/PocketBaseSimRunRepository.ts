import {
  DomainError,
  err,
  ok,
  type Result,
  type SimRun,
  type SimRunRepository,
} from "@orbitlab/domain";
import type { PbLike } from "../../types/pb-like.js";
import { fromSimRun, toSimRun } from "../mappers/simRunMapper.js";

const COLLECTION = "sim_runs";

/**
 * PocketBase adapter for {@link SimRunRepository}.
 */
export class PocketBaseSimRunRepository implements SimRunRepository {
  constructor(
    private readonly pb: PbLike,
    private readonly resolveOwnerId?: () => string | null
  ) {}

  async findById(id: string): Promise<Result<SimRun | null, DomainError>> {
    try {
      const record = await this.pb.collection(COLLECTION).getOne(id);
      return ok(toSimRun(record));
    } catch {
      return ok(null);
    }
  }

  async listByDesign(
    designId: string
  ): Promise<Result<SimRun[], DomainError>> {
    try {
      const filter = `design = "${escapeFilter(designId)}"`;
      const records = await this.pb.collection(COLLECTION).getFullList({
        filter,
        sort: "-created",
      });
      return ok(records.map(toSimRun));
    } catch (e) {
      return err(mapPbError(e, "Failed to list sim runs"));
    }
  }

  async save(run: SimRun): Promise<Result<SimRun, DomainError>> {
    try {
      const ownerId = this.resolveOwnerId?.() ?? undefined;
      const body = fromSimRun(run, ownerId);
      const existing = await this.findById(run.id);
      if (!existing.ok) return existing as Result<SimRun, DomainError>;

      if (existing.value) {
        const updated = await this.pb
          .collection(COLLECTION)
          .update(run.id, body);
        return ok(toSimRun(updated));
      }

      const createBody = { ...body, id: run.id };
      const created = await this.pb.collection(COLLECTION).create(createBody);
      return ok(toSimRun(created));
    } catch (e) {
      return err(mapPbError(e, "Failed to save sim run"));
    }
  }
}

function escapeFilter(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function mapPbError(e: unknown, fallback: string): DomainError {
  if (e instanceof DomainError) return e;
  const message = e instanceof Error ? e.message : fallback;
  return DomainError.validation(message);
}
