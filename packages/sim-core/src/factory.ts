import { massPropertiesModule } from './modules/mass-properties.js';
import { simpleDragModule } from './modules/simple-drag.js';
import { stabilityMarginLiteModule } from './modules/stability-margin-lite.js';
import { toyVerticalFlightModule } from './modules/toy-vertical-flight.js';
import { SimulationPipeline } from './pipeline.js';
import { ModuleRegistry } from './registry.js';

/**
 * Factory: register all built-in free (and later pro) modules.
 */
export function createDefaultRegistry(): ModuleRegistry {
  const registry = new ModuleRegistry();
  registry.register(massPropertiesModule);
  registry.register(stabilityMarginLiteModule);
  registry.register(simpleDragModule);
  registry.register(toyVerticalFlightModule);
  return registry;
}

/**
 * Factory: pipeline wired to the default module registry.
 */
export function createDefaultPipeline(): SimulationPipeline {
  return new SimulationPipeline(createDefaultRegistry());
}

/**
 * Fast free-tier demo order: mass resolution + 1D flight only.
 * Prefer this for interactive previews and default UI runs.
 */
export const DEFAULT_FREE_MODULE_IDS = [
  'mass.properties',
  'flight.toy-vertical',
] as const;

/**
 * Full free-tier suite: mass → stability → aero → flight.
 * Use when the host wants every educational free module in one pass.
 */
export const FULL_FREE_MODULE_IDS = [
  'mass.properties',
  'stability.margin-lite',
  'aero.simple-drag',
  'flight.toy-vertical',
] as const;
