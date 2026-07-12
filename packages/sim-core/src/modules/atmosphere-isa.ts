import type { CalcModule, EquationStep, ModuleResult } from '../module.js';
import { STANDARD_G, type RocketDesignSnapshot } from '../types.js';

/** ISA 1976 sea-level static temperature (K). */
export const ISA_T0_K = 288.15;

/** ISA 1976 sea-level static pressure (Pa). */
export const ISA_P0_PA = 101_325;

/** ISA 1976 sea-level density (kg/m³) — golden ρ₀ ≈ 1.225. */
export const ISA_RHO0_KG_M3 = 1.225;

/**
 * Temperature lapse rate in the troposphere (K/m).
 * T decreases with altitude: T = T₀ − L·h.
 */
export const ISA_LAPSE_K_PER_M = 0.0065;

/** Specific gas constant for dry air (J/(kg·K)). */
export const ISA_R_SPECIFIC = 287.05287;

/** Troposphere ceiling for this educational approximation (m). */
export const ISA_TROPOPAUSE_M = 11_000;

export interface AtmosphereIsaInput {
  /** Geometric altitude above mean sea level (m) */
  altitudeM?: number;
}

export interface AtmosphereIsaData {
  temperatureK: number;
  pressurePa: number;
  densityKgM3: number;
  altitudeM: number;
  model: 'ISA-1976-troposphere-approx';
}

/** Design snapshot may carry free-form metadata (not on the core type yet). */
type DesignWithMeta = RocketDesignSnapshot & {
  metadata?: Record<string, unknown>;
};

/**
 * Resolve geometric altitude (m) from module input, then design.metadata.altitudeM, else 0.
 */
export function resolveAltitudeM(
  design: RocketDesignSnapshot,
  input?: AtmosphereIsaInput
): number {
  if (input?.altitudeM !== undefined && Number.isFinite(input.altitudeM)) {
    return input.altitudeM;
  }
  const meta = (design as DesignWithMeta).metadata;
  const fromMeta = meta?.altitudeM;
  if (typeof fromMeta === 'number' && Number.isFinite(fromMeta)) {
    return fromMeta;
  }
  return 0;
}

/**
 * ISA-1976 troposphere (educational): T, p, ρ at geometric altitude h.
 *
 * Valid band for this module: 0 ≤ h ≤ 11 km (clamped with a note in the report path).
 *
 * Formulas:
 * - Lapse: \( T = T_0 - L h \)
 * - Pressure power law: \( p = p_0 (T/T_0)^{g_0/(R L)} \)
 * - Ideal gas density: \( \rho = p / (R T) \)
 *   (equivalently \( \rho = \rho_0 (T/T_0)^{(g_0/(R L))-1} \))
 */
export function computeAtmosphereIsa(altitudeM: number): AtmosphereIsaData {
  if (!Number.isFinite(altitudeM)) {
    throw new Error('aero.atmosphere-isa: altitudeM must be finite');
  }
  if (altitudeM < 0) {
    throw new Error(
      'aero.atmosphere-isa: altitudeM must be ≥ 0 m (geometric AMSL)'
    );
  }

  // Educational clamp: stay in troposphere model band
  const h = Math.min(altitudeM, ISA_TROPOPAUSE_M);

  const T0 = ISA_T0_K;
  const p0 = ISA_P0_PA;
  const L = ISA_LAPSE_K_PER_M;
  const R = ISA_R_SPECIFIC;
  const g0 = STANDARD_G;

  const temperatureK = T0 - L * h;
  if (!(temperatureK > 0) || !Number.isFinite(temperatureK)) {
    throw new Error('aero.atmosphere-isa: non-positive temperature from lapse model');
  }

  const exponent = g0 / (R * L);
  const tempRatio = temperatureK / T0;
  const pressurePa = p0 * Math.pow(tempRatio, exponent);
  const densityKgM3 = pressurePa / (R * temperatureK);

  return {
    temperatureK,
    pressurePa,
    densityKgM3,
    altitudeM: h,
    model: 'ISA-1976-troposphere-approx',
  };
}

/**
 * Free module: International Standard Atmosphere (ISA 1976) troposphere properties.
 * Geometric altitude from design.metadata.altitudeM (or 0 / input override).
 */
export const atmosphereIsaModule: CalcModule<
  AtmosphereIsaInput | undefined,
  AtmosphereIsaData
> = {
  id: 'aero.atmosphere-isa',
  title: {
    en: 'ISA atmosphere (troposphere)',
    tr: 'ISA atmosfer (troposfer)',
  },
  tier: 'free',
  references: [
    'ISO 2533 / ICAO Doc 7488 — International Standard Atmosphere',
    'U.S. Standard Atmosphere, 1976 — troposphere (0–11 km) layer',
    'Anderson, Introduction to Flight — hydrostatic + ideal-gas atmosphere model',
  ],

  run(input, ctx): ModuleResult<AtmosphereIsaData> {
    const requested = resolveAltitudeM(ctx.design, input);
    const data = computeAtmosphereIsa(requested);

    const T0 = ISA_T0_K;
    const p0 = ISA_P0_PA;
    const L = ISA_LAPSE_K_PER_M;
    const R = ISA_R_SPECIFIC;
    const g0 = STANDARD_G;
    const exponent = g0 / (R * L);
    const tempRatio = data.temperatureK / T0;

    const steps: EquationStep[] = [
      {
        title: 'Assumptions',
        prose:
          'ISA-1976 troposphere educational approximation only (0–11 km). Dry air, hydrostatic equilibrium, constant lapse rate, ideal gas. Geometric altitude treated as ISA geopotential height for this free-tier module. Not a full multi-layer atmosphere table.',
      },
      {
        title: 'Altitude',
        prose:
          requested > ISA_TROPOPAUSE_M
            ? `Requested h = ${requested.toFixed(1)} m exceeds troposphere band; clamped to h = ${data.altitudeM.toFixed(1)} m (tropopause).`
            : `Geometric altitude h = ${data.altitudeM.toFixed(2)} m (from ${
                input?.altitudeM !== undefined && Number.isFinite(input.altitudeM)
                  ? 'module input'
                  : (ctx.design as DesignWithMeta).metadata?.altitudeM !== undefined
                    ? 'design.metadata.altitudeM'
                    : 'default sea level (0)'
              }).`,
      },
      {
        title: 'Temperature (linear lapse)',
        latex: 'T = T_0 - L h',
        prose: `T = ${T0} − ${L} × ${data.altitudeM.toFixed(2)} = ${data.temperatureK.toFixed(4)} K (T₀ = ${T0} K, L = ${L} K/m).`,
      },
      {
        title: 'Pressure (power law)',
        latex: 'p = p_0 \\left(\\frac{T}{T_0}\\right)^{g_0/(R L)}',
        prose: `Exponent g₀/(R L) = ${g0}/(${R}×${L}) = ${exponent.toFixed(6)}. p = ${p0} × (${tempRatio.toFixed(6)})^${exponent.toFixed(4)} = ${data.pressurePa.toFixed(2)} Pa.`,
      },
      {
        title: 'Density (ideal gas)',
        latex: '\\rho = \\frac{p}{R T}\\quad\\text{or}\\quad\\rho = \\rho_0\\left(\\frac{T}{T_0}\\right)^{g_0/(R L)-1}',
        prose: `ρ = ${data.pressurePa.toFixed(2)} / (${R} × ${data.temperatureK.toFixed(4)}) = ${data.densityKgM3.toFixed(6)} kg/m³ (sea-level ρ₀ ≈ ${ISA_RHO0_KG_M3} kg/m³).`,
      },
    ];

    ctx.emit?.({
      type: 'aero.atmosphere.resolved',
      payload: {
        temperatureK: data.temperatureK,
        pressurePa: data.pressurePa,
        densityKgM3: data.densityKgM3,
        altitudeM: data.altitudeM,
      },
    });

    return {
      moduleId: this.id,
      data,
      steps,
    };
  },
};
