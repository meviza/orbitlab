import type { RocketDesign, PlanTier } from "@orbitlab/domain";
import type { SimProgressEvent, SimRunResultDto } from "../dto/sim-run-dto.js";

/**
 * Application port for executing calculation modules against a design.
 * Implemented by sim-core adapters (worker, in-process, etc.).
 */
export interface ModuleTierLookup {
  /** Resolve the plan tier required to run a module. Defaults to "free" if unknown. */
  requiredTier(moduleId: string): PlanTier | Promise<PlanTier>;
}

export interface SimulationRunnerPort {
  run(
    design: RocketDesign,
    moduleIds: readonly string[],
    onProgress?: (event: SimProgressEvent) => void
  ): Promise<SimRunResultDto>;
}
