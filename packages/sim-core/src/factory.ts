import { massPropertiesModule } from './modules/mass-properties.js';
import { simpleDragModule } from './modules/simple-drag.js';
import { stabilityBarrowmanModule } from './modules/stability-barrowman.js';
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
  registry.register(stabilityBarrowmanModule);
  // Optional lite estimator — still available, not in FULL_FREE by default
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
 * Full free-tier suite: mass → Barrowman stability → aero → flight.
 * `stability.margin-lite` remains registered for hosts that opt in.
 */
export const FULL_FREE_MODULE_IDS = [
  'mass.properties',
  'stability.barrowman',
  'aero.simple-drag',
  'flight.toy-vertical',
] as const;
