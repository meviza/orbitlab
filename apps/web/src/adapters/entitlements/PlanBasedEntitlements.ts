import {
  type CalcModuleId,
  type EntitlementPort,
  type PlanTier,
  type User,
  tierMeetsRequirement,
} from "@orbitlab/domain";

/**
 * Entitlements driven by the authenticated user's plan field.
 * Used in PocketBase mode where plan comes from the users collection.
 */
export class PlanBasedEntitlements implements EntitlementPort {
  canUseModule(
    user: User,
    _moduleId: CalcModuleId,
    tierRequired: PlanTier
  ): boolean {
    return tierMeetsRequirement(user.plan, tierRequired);
  }
}
