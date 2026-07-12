import type { CalcModule, ModuleResult, SimContext } from './module.js';
import type { ModuleRegistry } from './registry.js';
import type { RocketDesignSnapshot, SimConfig } from './types.js';

/** Observer: progress events during a pipeline run. */
export interface SimProgressEvent {
  type: 'module:start' | 'module:done' | 'pipeline:start' | 'pipeline:done' | 'pipeline:error';
  moduleId?: string;
  index?: number;
  total?: number;
  result?: ModuleResult;
  error?: unknown;
}

export type SimProgressListener = (event: SimProgressEvent) => void;

export interface PipelineRunOptions {
  design: RocketDesignSnapshot;
  config: SimConfig;
  /** Ordered module ids to execute. */
  moduleIds: string[];
  /** Optional per-module inputs keyed by module id. */
  inputs?: Record<string, unknown>;
  onProgress?: SimProgressListener;
}

export interface PipelineRunResult {
  results: Map<string, ModuleResult>;
  ordered: ModuleResult[];
  design: RocketDesignSnapshot;
  config: SimConfig;
}

/**
 * Runs an ordered list of CalcModules, accumulating results into context.
 */
export class SimulationPipeline {
  constructor(private readonly registry: ModuleRegistry) {}

  run(opts: PipelineRunOptions): PipelineRunResult {
    const { design, config, moduleIds, inputs = {}, onProgress } = opts;
    const previous = new Map<string, ModuleResult>();
    const ordered: ModuleResult[] = [];
    const total = moduleIds.length;

    const emit = (event: { type: string; payload?: unknown }) => {
      onProgress?.({
        type: event.type as SimProgressEvent['type'],
        ...(event.payload as object),
      });
    };

    onProgress?.({ type: 'pipeline:start', total });

    try {
      for (let index = 0; index < moduleIds.length; index++) {
        const moduleId = moduleIds[index]!;
        const mod: CalcModule = this.registry.require(moduleId);

        onProgress?.({ type: 'module:start', moduleId, index, total });

        const ctx: SimContext = {
          design,
          config,
          previous,
          emit: (e) => {
            onProgress?.({
              type: e.type as SimProgressEvent['type'],
              moduleId,
              ...(typeof e.payload === 'object' && e.payload !== null
                ? (e.payload as object)
                : { payload: e.payload }),
            });
          },
        };

        const input = inputs[moduleId];
        const result = mod.run(input, ctx);
        previous.set(moduleId, result);
        ordered.push(result);

        onProgress?.({
          type: 'module:done',
          moduleId,
          index,
          total,
          result,
        });
      }

      onProgress?.({ type: 'pipeline:done', total });

      return { results: previous, ordered, design, config };
    } catch (error) {
      onProgress?.({ type: 'pipeline:error', error });
      throw error;
    }
  }
}
