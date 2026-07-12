/** 3D vector (SI units unless noted). */
export type Vec3 = { x: number; y: number; z: number };

/** Numerical integration / run configuration. */
export interface SimConfig {
  /** Time step (s) */
  dt: number;
  /** Max simulation time (s) */
  tMax: number;
  /** Integrator selection for trajectory modules */
  integrator?: 'euler' | 'rk4';
}

/** Single trajectory sample (1D vertical). */
export interface SimSample {
  t: number;
  altitude: number;
  velocity: number;
}

/**
 * Minimal rocket design snapshot consumed by calc modules.
 * Application layer maps richer domain models into this shape.
 */
export interface RocketDesignSnapshot {
  massKg: number;
  cd: number;
  areaM2: number;
  thrustN: number;
  burnTimeS: number;
  /** Optional part masses or structural breakdown (kg) */
  components?: Array<{ id: string; massKg: number; name?: string }>;
}

/** Default sim config for free-tier vertical flight. */
export const DEFAULT_SIM_CONFIG: SimConfig = {
  dt: 0.01,
  tMax: 30,
  integrator: 'euler',
};
