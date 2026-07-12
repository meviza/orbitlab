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
 * Structural role for free-tier aero / stability heuristics.
 * Application layer maps richer component types into these labels.
 */
export type ComponentKind = 'nose' | 'body' | 'fin' | 'motor' | 'other';

/**
 * Optional geometry / role fields used by free-tier modules.
 * All linear dimensions are metres (SI).
 */
export interface DesignComponent {
  id: string;
  massKg: number;
  name?: string;
  /** Role for stability / aero heuristics */
  kind?: ComponentKind;
  /**
   * Axial station of the component reference (usually forward face or
   * root leading edge) measured from the nose tip (m).
   */
  stationM?: number;
  /** Axial length of the component (m) */
  lengthM?: number;
  /** Local diameter (m) — body/nose */
  diameterM?: number;
  /** Fin semi-span from root to tip (m) */
  spanM?: number;
  /** Fin root chord (m) */
  rootChordM?: number;
  /** Fin tip chord (m) */
  tipChordM?: number;
  /**
   * Fin leading-edge sweep distance along the body axis (m):
   * axial offset of tip LE aft of root LE. Used by Barrowman mid-chord length.
   */
  sweepM?: number;
  /** Number of fins when kind is fin */
  finCount?: number;
  /** Free-form passthrough metadata */
  metadata?: Record<string, unknown>;
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
  /** Optional part masses or structural breakdown */
  components?: DesignComponent[];
  /** Overall length tip-to-tail (m) */
  lengthM?: number;
  /** Reference body diameter (m) — used for caliber margins */
  diameterM?: number;
  /** Measured / design CG from nose tip (m) */
  cgFromNoseM?: number;
  /**
   * Sample freestream velocity (m/s) for algebraic aero summaries
   * (not a full trajectory).
   */
  velocitySampleMs?: number;
  /** Ambient air density override (kg/m³); default sea-level 1.225 */
  rhoKgM3?: number;
}

/** Default sim config for free-tier vertical flight. */
export const DEFAULT_SIM_CONFIG: SimConfig = {
  dt: 0.01,
  tMax: 30,
  integrator: 'euler',
};

/** Sea-level ISA air density (kg/m³). */
export const SEA_LEVEL_RHO_KG_M3 = 1.225;

/** Standard gravity (m/s²). */
export const STANDARD_G = 9.80665;
