import {
  createDefaultPipeline,
  createDefaultRegistry,
  DEFAULT_FREE_MODULE_IDS,
} from './factory.js';
import type { ModuleResult } from './module.js';
import {
  SimulationPipeline,
  type PipelineRunResult,
  type SimProgressListener,
} from './pipeline.js';
import type { ModuleRegistry } from './registry.js';
import {
  DEFAULT_SIM_CONFIG,
  type RocketDesignSnapshot,
  type SimConfig,
} from './types.js';

export interface RunOptions {
  /** Override default free module order */
  moduleIds?: string[];
  config?: Partial<SimConfig>;
  inputs?: Record<string, unknown>;
  onProgress?: SimProgressListener;
}

export interface SimulationRunSummary {
  results: Map<string, ModuleResult>;
  ordered: ModuleResult[];
  byId: Record<string, ModuleResult>;
  design: RocketDesignSnapshot;
  config: SimConfig;
}

/**
 * Application-facing facade over registry + pipeline.
 * Used by the web Worker / desktop host later.
 */
export class SimulationRunner {
  private readonly registry: ModuleRegistry;
  private readonly pipeline: SimulationPipeline;

  constructor(registry?: ModuleRegistry) {
    this.registry = registry ?? createDefaultRegistry();
    this.pipeline = new SimulationPipeline(this.registry);
  }

  getRegistry(): ModuleRegistry {
    return this.registry;
  }

  /**
   * Run an ordered set of modules against a design snapshot.
   */
  run(
    snapshot: RocketDesignSnapshot,
    moduleIds?: string[],
    options: Omit<RunOptions, 'moduleIds'> = {}
  ): SimulationRunSummary {
    const config: SimConfig = {
      ...DEFAULT_SIM_CONFIG,
      ...options.config,
    };

    const ids =
      moduleIds && moduleIds.length > 0
        ? moduleIds
        : [...DEFAULT_FREE_MODULE_IDS];

    const result: PipelineRunResult = this.pipeline.run({
      design: snapshot,
      config,
      moduleIds: ids,
      inputs: options.inputs,
      onProgress: options.onProgress,
    });

    const byId: Record<string, ModuleResult> = {};
    for (const [id, modResult] of result.results) {
      byId[id] = modResult;
    }

    return {
      results: result.results,
      ordered: result.ordered,
      byId,
      design: result.design,
      config: result.config,
    };
  }
}

/** Convenience: one-shot run with the default pipeline. */
export function runDefaultSimulation(
  snapshot: RocketDesignSnapshot,
  options: RunOptions = {}
): SimulationRunSummary {
  const runner = new SimulationRunner();
  return runner.run(snapshot, options.moduleIds, options);
}

/** Expose factory helper for hosts that only need a pipeline. */
export { createDefaultPipeline };
