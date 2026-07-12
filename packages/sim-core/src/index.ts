/**
 * OrbitLab simulation core — placeholder.
 * Phase 1 will add mass properties, aero, integration, and event models.
 */

export type Vec3 = { x: number; y: number; z: number };

export interface SimConfig {
  /** Time step (s) */
  dt: number;
  /** Max simulation time (s) */
  tMax: number;
}

export interface SimSample {
  t: number;
  altitude: number;
  velocity: number;
}

/**
 * Toy vertical flight: constant thrust then coast under g.
 * Educational placeholder — not flight-accurate.
 */
export function simulateToyVertical(
  opts: {
    massKg: number;
    thrustN: number;
    burnTimeS: number;
    cd?: number;
    areaM2?: number;
  },
  config: SimConfig = { dt: 0.01, tMax: 30 }
): SimSample[] {
  const g = 9.80665;
  const cd = opts.cd ?? 0.5;
  const area = opts.areaM2 ?? 0.01;
  const rho = 1.225;

  let t = 0;
  let h = 0;
  let v = 0;
  const samples: SimSample[] = [{ t, altitude: h, velocity: v }];

  while (t < config.tMax && (h > 0 || t === 0)) {
    const thrust = t < opts.burnTimeS ? opts.thrustN : 0;
    // vertical: +up; drag opposes velocity
    const dragForce =
      v === 0 ? 0 : -Math.sign(v) * 0.5 * rho * v * v * cd * area;
    const a = thrust / opts.massKg - g + dragForce / opts.massKg;
    v += a * config.dt;
    h += v * config.dt;
    t += config.dt;
    if (h < 0) {
      h = 0;
      v = 0;
      samples.push({ t, altitude: h, velocity: v });
      break;
    }
    samples.push({ t, altitude: h, velocity: v });
  }

  return samples;
}
