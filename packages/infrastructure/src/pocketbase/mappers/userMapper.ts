import {
  User,
  isPlanTier,
  type PlanTier,
  DomainError,
} from "@orbitlab/domain";
import type { PbRecord } from "../../types/pb-like.js";

function asPlanTier(value: unknown): PlanTier {
  if (typeof value === "string" && isPlanTier(value)) {
    return value;
  }
  return "free";
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asBool(value: unknown): boolean {
  return value === true;
}

/** Map a PocketBase auth/users record → domain User. */
export function toUser(record: PbRecord): User {
  try {
    const plan = asPlanTier(record.plan);
    const eduVerified = asBool(record.edu_verified);
    return User.create({
      id: asString(record.id),
      email: asString(record.email),
      plan: plan === "edu" && !eduVerified ? "free" : plan,
      eduVerified: plan === "edu" ? true : eduVerified,
    });
  } catch (e) {
    if (e instanceof DomainError) throw e;
    throw DomainError.validation("Invalid user record from PocketBase");
  }
}

/** Map domain User fields → PocketBase write body (partial updates OK). */
export function fromUser(
  user: Partial<{
    email: string;
    plan: PlanTier;
    eduVerified: boolean;
    displayName: string;
  }>
): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  if (user.displayName !== undefined) body.display_name = user.displayName;
  if (user.plan !== undefined) body.plan = user.plan;
  if (user.eduVerified !== undefined) body.edu_verified = user.eduVerified;
  if (user.email !== undefined) body.email = user.email;
  return body;
}

export const userMapper = { toUser, fromUser };
