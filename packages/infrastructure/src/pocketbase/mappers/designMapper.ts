import {
  RocketComponent,
  RocketDesign,
  DomainError,
} from "@orbitlab/domain";
import type { PbRecord } from "../../types/pb-like.js";

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asObject(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function asComponents(value: unknown): RocketComponent[] {
  if (!Array.isArray(value)) return [];
  return value.map((raw, index) => {
    const item = (raw && typeof raw === "object" ? raw : {}) as Record<
      string,
      unknown
    >;
    return RocketComponent.create({
      id: asString(item.id, `comp-${index}`),
      type: asString(item.type ?? item.kind, "other"),
      name: asString(item.name, "unnamed"),
      params: asObject(item.params),
    });
  });
}

/** Map a PocketBase designs record → domain RocketDesign. */
export function toDesign(record: PbRecord): RocketDesign {
  try {
    return RocketDesign.create({
      id: asString(record.id),
      ownerId: asString(record.owner),
      title: asString(record.title, "Untitled"),
      components: asComponents(record.components),
      metadata: asObject(record.metadata),
    });
  } catch (e) {
    if (e instanceof DomainError) throw e;
    throw DomainError.validation("Invalid design record from PocketBase");
  }
}

/** Map domain RocketDesign → PocketBase write body. */
export function fromDesign(design: RocketDesign): Record<string, unknown> {
  return {
    title: design.title,
    owner: design.ownerId,
    components: design.components.map((c) => ({
      id: c.id,
      type: c.type,
      name: c.name,
      params: c.params,
    })),
    metadata: design.metadata,
  };
}

export const designMapper = { toDesign, fromDesign };
