/** Product plan tiers on a user account. */
export type PlanTier = "free" | "pro" | "edu";

const PLAN_TIERS: readonly PlanTier[] = ["free", "pro", "edu"] as const;

/** Numeric rank for entitlement comparisons (higher = more access). */
const TIER_RANK: Record<PlanTier, number> = {
  free: 0,
  edu: 1,
  pro: 1,
};

export function isPlanTier(value: unknown): value is PlanTier {
  return typeof value === "string" && (PLAN_TIERS as readonly string[]).includes(value);
}

export function parsePlanTier(value: unknown): PlanTier {
  if (!isPlanTier(value)) {
    throw new Error(`Invalid plan tier: ${String(value)}`);
  }
  return value;
}

/**
 * Whether `userTier` satisfies a module's required tier.
 * `edu` and `pro` both unlock pro-tier modules.
 */
export function tierMeetsRequirement(
  userTier: PlanTier,
  required: PlanTier
): boolean {
  if (required === "free") return true;
  if (required === "pro" || required === "edu") {
    return TIER_RANK[userTier] >= TIER_RANK.pro;
  }
  return false;
}

export function planTierLabel(tier: PlanTier): string {
  switch (tier) {
    case "free":
      return "Free";
    case "pro":
      return "Pro";
    case "edu":
      return "Education";
  }
}
