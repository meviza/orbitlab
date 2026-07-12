import {
  SimRun,
  type SimRunStatus,
  type SimSummaryMetrics,
  DomainError,
} from "@orbitlab/domain";
import type { PbRecord } from "../../types/pb-like.js";

const STATUSES: readonly SimRunStatus[] = [
  "pending",
  "running",
  "completed",
  "failed",
  "cancelled",
];

function asDate(value: unknown): Date {
  if (value instanceof Date) return value;
  if (typeof value === "string" || typeof value === "number") {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return new Date();
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asObject(value: unknown): SimSummaryMetrics {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as SimSummaryMetrics;
  }
  return {};
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string");
}

function asStatus(value: unknown): SimRunStatus {
  if (
    typeof value === "string" &&
    (STATUSES as readonly string[]).includes(value)
  ) {
    return value as SimRunStatus;
  }
  return "pending";
}

/** Map a PocketBase sim_runs record → domain SimRun. */
export function toSimRun(record: PbRecord): SimRun {
  try {
    const moduleIds = asStringArray(record.module_ids);
    return SimRun.create({
      id: asString(record.id),
      designId: asString(record.design),
      moduleIds: moduleIds.length > 0 ? moduleIds : ["flight.toy-vertical"],
      status: asStatus(record.status),
      summary: asObject(record.summary),
      createdAt: asDate(record.created),
      errorMessage:
        typeof record.error_message === "string"
          ? record.error_message
          : undefined,
    });
  } catch (e) {
    if (e instanceof DomainError) throw e;
    throw DomainError.validation("Invalid sim_run record from PocketBase");
  }
}

/** Map domain SimRun → PocketBase write body. */
export function fromSimRun(
  run: SimRun,
  ownerId?: string
): Record<string, unknown> {
  const body: Record<string, unknown> = {
    design: run.designId,
    module_ids: [...run.moduleIds],
    status: run.status,
    summary: run.summary,
  };
  if (ownerId) body.owner = ownerId;
  if (run.errorMessage) body.error_message = run.errorMessage;
  return body;
}

export const simRunMapper = { toSimRun, fromSimRun };
