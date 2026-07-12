/**
 * @orbitlab/sim-core
 * Physics and numerics engine — pure TypeScript calculation modules.
 *
 * Patterns: Strategy (CalcModule), Registry, Pipeline, Factory, Observer.
 */

// Types
export type {
  Vec3,
  SimConfig,
  SimSample,
  ComponentKind,
  DesignComponent,
  RocketDesignSnapshot,
} from './types.js';
export {
  DEFAULT_SIM_CONFIG,
  SEA_LEVEL_RHO_KG_M3,
  STANDARD_G,
} from './types.js';

// Module contract (Strategy)
export type {
  ModuleTier,
  EquationStep,
  ModuleResult,
  CalcModule,
  SimContext,
} from './module.js';

// Registry
export { ModuleRegistry } from './registry.js';

// Pipeline + Observer
export {
  SimulationPipeline,
  type SimProgressEvent,
  type SimProgressListener,
  type PipelineRunOptions,
  type PipelineRunResult,
} from './pipeline.js';

// Integrators
export {
  eulerStep,
  integrateEuler1D,
  eulerVerticalStep,
} from './integrators/euler.js';
export {
  rk4Step,
  integrateRk41D,
  rk4VerticalStep,
} from './integrators/rk4.js';

// Built-in modules
export {
  massPropertiesModule,
  type MassPropertiesInput,
  type MassPropertiesData,
} from './modules/mass-properties.js';
export {
  simpleDragModule,
  computeSimpleDrag,
  DEFAULT_VELOCITY_SAMPLE_MS,
  type SimpleDragInput,
  type SimpleDragData,
} from './modules/simple-drag.js';
export {
  stabilityMarginLiteModule,
  computeStabilityMarginLite,
  estimateComponentCp,
  estimateCgFromComponents,
  type StabilityMarginLiteInput,
  type StabilityMarginLiteData,
  type ComponentCpContribution,
} from './modules/stability-margin-lite.js';
export {
  stabilityBarrowmanModule,
  computeStabilityBarrowman,
  estimateCgFromComponents as estimateCgFromComponentsBarrowman,
  noseBarrowmanContribution,
  bodyBarrowmanContribution,
  finBarrowmanContribution,
  type StabilityBarrowmanInput,
  type StabilityBarrowmanData,
  type BarrowmanPartContribution,
} from './modules/stability-barrowman.js';
export {
  toyVerticalFlightModule,
  simulateToyVertical,
  type ToyVerticalFlightData,
} from './modules/toy-vertical-flight.js';

// Factory
export {
  createDefaultRegistry,
  createDefaultPipeline,
  DEFAULT_FREE_MODULE_IDS,
  FULL_FREE_MODULE_IDS,
} from './factory.js';

// Runner (application facade)
export {
  SimulationRunner,
  runDefaultSimulation,
  type RunOptions,
  type SimulationRunSummary,
} from './runner.js';
