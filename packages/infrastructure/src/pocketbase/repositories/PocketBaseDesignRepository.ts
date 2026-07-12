import {
  DomainError,
  err,
  ok,
  type DesignRepository,
  type Result,
  type RocketDesign,
} from "@orbitlab/domain";
import type { PbLike } from "../../types/pb-like.js";
import { fromDesign, toDesign } from "../mappers/designMapper.js";

const COLLECTION = "designs";

/**
 * PocketBase adapter for {@link DesignRepository}.
 * API rules enforce owner-scoped CRUD; client still scopes list filters by owner.
 */
export class PocketBaseDesignRepository implements DesignRepository {
  constructor(private readonly pb: PbLike) {}

  async findById(
    id: string
  ): Promise<Result<RocketDesign | null, DomainError>> {
    try {
      const record = await this.pb.collection(COLLECTION).getOne(id);
      return ok(toDesign(record));
    } catch {
      return ok(null);
    }
  }

  async listByOwner(
    ownerId: string
  ): Promise<Result<RocketDesign[], DomainError>> {
    try {
      const filter = `owner = "${escapeFilter(ownerId)}"`;
      const records = await this.pb.collection(COLLECTION).getFullList({
        filter,
        sort: "-updated",
      });
      return ok(records.map(toDesign));
    } catch (e) {
      return err(mapPbError(e, "Failed to list designs"));
    }
  }

  async save(
    design: RocketDesign
  ): Promise<Result<RocketDesign, DomainError>> {
    try {
      const body = fromDesign(design);
      const existing = await this.findById(design.id);
      if (!existing.ok) return existing as Result<RocketDesign, DomainError>;

      if (existing.value) {
        const updated = await this.pb
          .collection(COLLECTION)
          .update(design.id, body);
        return ok(toDesign(updated));
      }

      const createBody = { ...body, id: design.id };
      const created = await this.pb.collection(COLLECTION).create(createBody);
      return ok(toDesign(created));
    } catch (e) {
      return err(mapPbError(e, "Failed to save design"));
    }
  }

  async delete(id: string): Promise<Result<void, DomainError>> {
    try {
      await this.pb.collection(COLLECTION).delete(id);
      return ok(undefined);
    } catch (e) {
      return err(mapPbError(e, "Failed to delete design"));
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
