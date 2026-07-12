import { massPropertiesModule } from './modules/mass-properties.js';
import { simpleDragModule } from './modules/simple-drag.js';
import { stabilityBarrowmanModule } from './modules/stability-barrowman.js';
import { stabilityMarginLiteModule } from './modules/stability-margin-lite.js';
import { toyVerticalFlightModule } from './modules/toy-vertical-flight.js';
import { motorThrustCurveModule } from './modules/motor-thrust-curve.js';
import { atmosphereIsaModule } from './modules/atmosphere-isa.js';
import { recoveryDeploySimpleModule } from './modules/recovery-deploy.js';
import { windConstantModule } from './modules/wind-constant.js';
import { SimulationPipeline } from './pipeline.js';
import { ModuleRegistry } from './registry.js';

/**
 * Factory: register all built-in free (and later pro) modules.
 */
export function createDefaultRegistry(): ModuleRegistry {
  const registry = new ModuleRegistry();
  registry.register(massPropertiesModule);
  registry.register(motorThrustCurveModule);
  registry.register(atmosphereIsaModule);
  registry.register(stabilityBarrowmanModule);
  registry.register(stabilityMarginLiteModule);
  registry.register(simpleDragModule);
  registry.register(windConstantModule);
  registry.register(toyVerticalFlightModule);
  registry.register(recoveryDeploySimpleModule);
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
 */
export const DEFAULT_FREE_MODULE_IDS = [
  'mass.properties',
  'flight.toy-vertical',
] as const;

/**
 * Full free-tier educational suite (Wave-16 modules included).
 * Order: mass → motor → atmosphere → stability → drag → wind → flight → recovery.
 */
export const FULL_FREE_MODULE_IDS = [
  'mass.properties',
  'motor.thrust-curve',
  'aero.atmosphere-isa',
  'stability.barrowman',
  'aero.simple-drag',
  'aero.wind-constant',
  'flight.toy-vertical',
  'recovery.deploy-simple',
] as const;
