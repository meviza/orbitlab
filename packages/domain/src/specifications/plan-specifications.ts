import type { User } from "../entities/user.js";
import type { PlanTier } from "../value-objects/plan-tier.js";
import { tierMeetsRequirement } from "../value-objects/plan-tier.js";

/**
 * Whether the user may run a module that requires `requiredTier`.
 * Pure specification — no I/O.
 */
export function canRunModule(user: User, requiredTier: PlanTier): boolean {
  return tierMeetsRequirement(user.plan, requiredTier);
}

/** True when the user is on the Pro plan (not free/edu). */
export function isProPlan(user: User): boolean {
  return user.plan === "pro";
}

/** True when the user is on Pro or verified Edu (paid-tier access). */
export function isPaidPlan(user: User): boolean {
  return user.plan === "pro" || (user.plan === "edu" && user.eduVerified);
}

/** True when the user is on the free tier. */
export function isFreePlan(user: User): boolean {
  return user.plan === "free";
}
