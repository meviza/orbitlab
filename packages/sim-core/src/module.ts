import type { RocketDesignSnapshot, SimConfig } from './types.js';

export type ModuleTier = 'free' | 'pro';

/** One exam-style equation step for the report engine. */
export interface EquationStep {
  title: string;
  latex?: string;
  prose: string;
}

/** Standard result envelope returned by every CalcModule. */
export interface ModuleResult<T = unknown> {
  moduleId: string;
  data: T;
  steps: EquationStep[];
  series?: Record<string, number[]>;
}

/**
 * Shared context passed to every module in a pipeline run.
 * `previous` holds results of modules already executed in order.
 */
export interface SimContext {
  design: RocketDesignSnapshot;
  config: SimConfig;
  previous: Map<string, ModuleResult>;
  emit?: (event: { type: string; payload?: unknown }) => void;
}

/**
 * Strategy contract: every calculation is a CalcModule.
 * Deterministic, pure (no network I/O), SI units at the edges.
 */
export interface CalcModule<I = unknown, O = unknown> {
  readonly id: string;
  readonly title: { en: string; tr: string };
  readonly tier: ModuleTier;
  readonly references: string[];
  run(input: I, ctx: SimContext): ModuleResult<O>;
}
