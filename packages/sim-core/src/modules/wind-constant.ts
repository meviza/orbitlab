import type { CalcModule, EquationStep, ModuleResult } from '../module.js';
import type { RocketDesignSnapshot } from '../types.js';

/** Default constant wind speed (m/s). */
export const DEFAULT_WIND_MS = 3;

/**
 * Default wind azimuth (degrees, meteorological FROM direction).
 * 0 = north, 90 = east, 180 = south, 270 = west.
 */
export const DEFAULT_WIND_AZIMUTH_DEG = 270;

export interface WindConstantInput {
  /** Horizontal wind speed (m/s) */
  windMs?: number;
  /** Meteorological FROM direction (deg clockwise from north) */
  windAzimuthDeg?: number;
  /** Override flight time for drift estimate (s) */
  flightTimeS?: number;
}

export interface WindConstantData {
  /** Eastward wind component (m/s); positive = toward east */
  windEastMs: number;
  /** Northward wind component (m/s); positive = toward north */
  windNorthMs: number;
  /** Horizontal wind speed magnitude (m/s) */
  windMs: number;
  /** Meteorological FROM azimuth (deg) */
  azimuthDeg: number;
  /**
   * Rough horizontal drift estimate (m): |w| × flightTime.
   * Null when no flight time is available from input or flight.toy-vertical.
   */
  driftEstimateM: number | null;
  /** Flight time used for drift (s), if any */
  flightTimeS: number | null;
}

function asFiniteNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

/**
 * Read optional free-form metadata from the design snapshot.
 * RocketDesignSnapshot does not declare `metadata`; callers may attach it.
 */
function designMetadata(
  design: RocketDesignSnapshot
): Record<string, unknown> | undefined {
  const meta = (design as RocketDesignSnapshot & {
    metadata?: Record<string, unknown>;
  }).metadata;
  return meta && typeof meta === 'object' ? meta : undefined;
}

/**
 * Convert meteorological wind (speed + FROM azimuth) into ENU horizontal components.
 *
 * Standard meteo → u/v:
 *   u (east)  = −W sin(θ)
 *   v (north) = −W cos(θ)
 *
 * Example: 3 m/s from west (θ = 270°) → east +3, north 0 (blows toward east).
 */
export function windComponentsFromMeteo(
  windMs: number,
  azimuthDeg: number
): { windEastMs: number; windNorthMs: number } {
  if (!(windMs >= 0) || !Number.isFinite(windMs)) {
    throw new Error('aero.wind-constant: windMs must be a finite number ≥ 0');
  }
  if (!Number.isFinite(azimuthDeg)) {
    throw new Error('aero.wind-constant: windAzimuthDeg must be finite');
  }

  const θ = (azimuthDeg * Math.PI) / 180;
  return {
    windEastMs: -windMs * Math.sin(θ),
    windNorthMs: -windMs * Math.cos(θ),
  };
}

/**
 * Pure constant-wind summary: horizontal components + optional drift estimate.
 */
export function computeConstantWind(opts: {
  windMs: number;
  azimuthDeg: number;
  flightTimeS?: number | null;
}): WindConstantData {
  const { windMs, azimuthDeg } = opts;
  const { windEastMs, windNorthMs } = windComponentsFromMeteo(
    windMs,
    azimuthDeg
  );

  const flightTimeS =
    opts.flightTimeS != null &&
    Number.isFinite(opts.flightTimeS) &&
    opts.flightTimeS >= 0
      ? opts.flightTimeS
      : null;

  const driftEstimateM =
    flightTimeS != null ? windMs * flightTimeS : null;

  return {
    windEastMs,
    windNorthMs,
    windMs,
    azimuthDeg,
    driftEstimateM,
    flightTimeS,
  };
}

/**
 * Free module: constant horizontal wind vector for educational drift estimates.
 * Not a full 3D atmosphere / turbulence model.
 */
export const windConstantModule: CalcModule<
  WindConstantInput | undefined,
  WindConstantData
> = {
  id: 'aero.wind-constant',
  title: {
    en: 'Constant wind',
    tr: 'Sabit rüzgâr',
  },
  tier: 'free',
  references: [
    'Meteorological wind direction — FROM azimuth, degrees clockwise from north',
    'ENU components: u = −W sin(θ), v = −W cos(θ)',
    'Simple drift estimate δ ≈ W · t_flight (constant wind, no lofting dynamics)',
  ],

  run(input, ctx): ModuleResult<WindConstantData> {
    const design = ctx.design;
    const meta = designMetadata(design);

    const windMs =
      input?.windMs ??
      asFiniteNumber(meta?.windMs) ??
      DEFAULT_WIND_MS;
    const azimuthDeg =
      input?.windAzimuthDeg ??
      asFiniteNumber(meta?.windAzimuthDeg) ??
      DEFAULT_WIND_AZIMUTH_DEG;

    const flightResult = ctx.previous.get('flight.toy-vertical');
    const flightTimeFromPrev = (
      flightResult?.data as { flightTimeS?: number } | undefined
    )?.flightTimeS;

    const flightTimeS =
      input?.flightTimeS ??
      (typeof flightTimeFromPrev === 'number' &&
      Number.isFinite(flightTimeFromPrev)
        ? flightTimeFromPrev
        : null);

    const data = computeConstantWind({
      windMs,
      azimuthDeg,
      flightTimeS,
    });

    const θRad = (azimuthDeg * Math.PI) / 180;
    const steps: EquationStep[] = [
      {
        title: 'Assumptions',
        prose:
          'Constant horizontal wind (no vertical component, no shear, no gusts). Azimuth is meteorological FROM direction (0° = north, 90° = east, 270° = west). Educational drift uses δ ≈ W · t only — not a ballistic trajectory with lofted drift.',
      },
      {
        title: 'Wind vector components (ENU)',
        latex:
          'u = -W\\sin\\theta,\\quad v = -W\\cos\\theta',
        prose: `With W = ${windMs.toFixed(3)} m/s and θ = ${azimuthDeg.toFixed(1)}° (FROM), east component u = −${windMs.toFixed(3)} · sin(${azimuthDeg.toFixed(1)}°) = ${data.windEastMs.toFixed(4)} m/s; north component v = −${windMs.toFixed(3)} · cos(${azimuthDeg.toFixed(1)}°) = ${data.windNorthMs.toFixed(4)} m/s. (θ_rad = ${θRad.toFixed(4)}.)`,
      },
      {
        title: 'Magnitude check',
        latex: 'W = \\sqrt{u^2 + v^2}',
        prose: `√(${data.windEastMs.toFixed(4)}² + ${data.windNorthMs.toFixed(4)}²) = ${Math.hypot(data.windEastMs, data.windNorthMs).toFixed(4)} m/s (should match W).`,
      },
    ];

    if (data.flightTimeS != null && data.driftEstimateM != null) {
      const source =
        input?.flightTimeS != null
          ? 'input override'
          : 'previous flight.toy-vertical';
      steps.push({
        title: 'Horizontal drift estimate',
        latex: '\\delta \\approx W\\, t_{\\mathrm{flight}}',
        prose: `Using t_flight = ${data.flightTimeS.toFixed(3)} s (${source}): δ ≈ ${windMs.toFixed(3)} × ${data.flightTimeS.toFixed(3)} = ${data.driftEstimateM.toFixed(3)} m. Drift direction follows the wind vector (toward ${(((azimuthDeg + 180) % 360 + 360) % 360).toFixed(0)}° TO).`,
      });
    } else {
      steps.push({
        title: 'Horizontal drift estimate',
        latex: '\\delta \\approx W\\, t_{\\mathrm{flight}}',
        prose:
          'No flight time available (run flight.toy-vertical first, or pass flightTimeS). Drift estimate left null.',
      });
    }

    ctx.emit?.({
      type: 'aero.wind.resolved',
      payload: {
        windEastMs: data.windEastMs,
        windNorthMs: data.windNorthMs,
        windMs: data.windMs,
        azimuthDeg: data.azimuthDeg,
        driftEstimateM: data.driftEstimateM,
      },
    });

    return {
      moduleId: this.id,
      data,
      steps,
    };
  },
};
