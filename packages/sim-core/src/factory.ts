import { massPropertiesModule } from './modules/mass-properties.js';
import { toyVerticalFlightModule } from './modules/toy-vertical-flight.js';
import { SimulationPipeline } from './pipeline.js';
import { ModuleRegistry } from './registry.js';

/**
 * Factory: register all built-in free (and later pro) modules.
 */
export function createDefaultRegistry(): ModuleRegistry {
  const registry = new ModuleRegistry();
  registry.register(massPropertiesModule);
  registry.register(toyVerticalFlightModule);
  return registry;
}

/**
 * Factory: pipeline wired to the default module registry.
 */
export function createDefaultPipeline(): SimulationPipeline {
  return new SimulationPipeline(createDefaultRegistry());
}

/** Canonical free-tier run order for a basic vertical flight analysis. */
export const DEFAULT_FREE_MODULE_IDS = [
  'mass.properties',
  'flight.toy-vertical',
] as const;
