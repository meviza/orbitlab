import {
  type CalcModuleId,
  type EntitlementPort,
  type PlanTier,
  type User,
  tierMeetsRequirement,
} from "@orbitlab/domain";

/** Demo entitlements: allow any module the user plan tier covers. */
export class FreePlanEntitlements implements EntitlementPort {
  canUseModule(
    user: User,
    _moduleId: CalcModuleId,
    tierRequired: PlanTier
  ): boolean {
    return tierMeetsRequirement(user.plan, tierRequired);
  }
}
