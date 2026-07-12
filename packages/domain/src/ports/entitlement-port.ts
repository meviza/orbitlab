import type { User } from "../entities/user.js";
import type { CalcModuleId } from "../value-objects/calc-module-id.js";
import type { PlanTier } from "../value-objects/plan-tier.js";

/**
 * Answers whether a user may execute a calculation module.
 * Implementations may consult plan, edu verification, feature flags, etc.
 */
export interface EntitlementPort {
  canUseModule(
    user: User,
    moduleId: CalcModuleId,
    tierRequired: PlanTier
  ): boolean | Promise<boolean>;
}
