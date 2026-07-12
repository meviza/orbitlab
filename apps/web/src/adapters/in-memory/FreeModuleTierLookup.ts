import type { ModuleTierLookup } from "@orbitlab/application";
import type { PlanTier } from "@orbitlab/domain";
import { createDefaultRegistry } from "@orbitlab/sim-core";

/**
 * Resolves module plan tiers from the sim-core registry.
 * Unknown modules default to free for the offline demo.
 */
export class FreeModuleTierLookup implements ModuleTierLookup {
  private readonly registry = createDefaultRegistry();

  requiredTier(moduleId: string): PlanTier {
    const mod = this.registry.get(moduleId);
    if (!mod) return "free";
    return mod.tier === "pro" ? "pro" : "free";
  }
}
