import { eulerVerticalStep } from '../integrators/euler.js';
import { rk4VerticalStep } from '../integrators/rk4.js';
import type { CalcModule, EquationStep, ModuleResult } from '../module.js';
import type { SimSample } from '../types.js';

export interface ToyVerticalFlightData {
  samples: SimSample[];
  maxAltitudeM: number;
  maxVelocityMs: number;
  apogeeTimeS: number;
  flightTimeS: number;
  integrator: 'euler' | 'rk4';
}

const G = 9.80665;
const RHO = 1.225; // sea-level air density kg/m³

/**
 * Pure toy 1D vertical flight (constant thrust then coast under g + quadratic drag).
 * Extracted from the original simulateToyVertical for reuse / golden tests.
 */
export function simulateToyVertical(
  opts: {
    massKg: number;
    thrustN: number;
    burnTimeS: number;
    cd?: number;
    areaM2?: number;
    integrator?: 'euler' | 'rk4';
  },
  config: { dt: number; tMax: number } = { dt: 0.01, tMax: 30 }
): SimSample[] {
  const cd = opts.cd ?? 0.5;
  const area = opts.areaM2 ?? 0.01;
  const integrator = opts.integrator ?? 'euler';
  const mass = opts.massKg;

  if (!(mass > 0)) {
    throw new Error('simulateToyVertical: massKg must be > 0');
  }

  const accel = (t: number, _h: number, v: number): number => {
    const thrust = t < opts.burnTimeS ? opts.thrustN : 0;
    const dragForce =
      v === 0 ? 0 : -Math.sign(v) * 0.5 * RHO * v * v * cd * area;
    return thrust / mass - G + dragForce / mass;
  };

  let t = 0;
  let h = 0;
  let v = 0;
  const samples: SimSample[] = [{ t, altitude: h, velocity: v }];
  const stepFn = integrator === 'rk4' ? rk4VerticalStep : eulerVerticalStep;

  while (t < config.tMax && (h > 0 || t === 0)) {
    const next = stepFn(accel, t, h, v, config.dt);
    v = next.v;
    h = next.h;
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

function summarize(samples: SimSample[]): Omit<
  ToyVerticalFlightData,
  'samples' | 'integrator'
> {
  let maxAltitudeM = 0;
  let maxVelocityMs = 0;
  let apogeeTimeS = 0;

  for (const s of samples) {
    if (s.altitude > maxAltitudeM) {
      maxAltitudeM = s.altitude;
      apogeeTimeS = s.t;
    }
    if (s.velocity > maxVelocityMs) {
      maxVelocityMs = s.velocity;
    }
  }

  const last = samples[samples.length - 1];
  return {
    maxAltitudeM,
    maxVelocityMs,
    apogeeTimeS,
    flightTimeS: last?.t ?? 0,
  };
}

/**
 * Free module: 1D vertical flight with constant thrust + quadratic drag.
 * Uses mass from previous mass.properties result when available.
 */
export const toyVerticalFlightModule: CalcModule<undefined, ToyVerticalFlightData> =
  {
    id: 'flight.toy-vertical',
    title: {
      en: 'Toy vertical flight',
      tr: 'Basit dikey uçuş',
    },
    tier: 'free',
    references: [
      'Newton II — constant mass particle',
      'Quadratic drag model D = ½ ρ v² C_D A',
      'Explicit Euler / classical RK4',
    ],

    run(_input, ctx): ModuleResult<ToyVerticalFlightData> {
      const { design, config, previous } = ctx;
      const massResult = previous.get('mass.properties');
      const massKg =
        (massResult?.data as { totalMassKg?: number } | undefined)?.totalMassKg ??
        design.massKg;

      const integrator = config.integrator ?? 'euler';
      const samples = simulateToyVertical(
        {
          massKg,
          thrustN: design.thrustN,
          burnTimeS: design.burnTimeS,
          cd: design.cd,
          areaM2: design.areaM2,
          integrator,
        },
        { dt: config.dt, tMax: config.tMax }
      );

      const summary = summarize(samples);
      const data: ToyVerticalFlightData = {
        samples,
        ...summary,
        integrator,
      };

      const steps: EquationStep[] = [
        {
          title: 'Assumptions',
          prose:
            '1D vertical motion, constant mass, sea-level air density ρ = 1.225 kg/m³, no wind, flat ground.',
        },
        {
          title: 'Equation of motion',
          latex: 'm a = T(t) - m g - \\mathrm{sign}(v)\\,\\tfrac12\\rho v^2 C_D A',
          prose: `Newton II with thrust T during burn (t < ${design.burnTimeS} s), gravity, and quadratic drag opposing velocity. m = ${massKg.toFixed(4)} kg, g = ${G} m/s².`,
        },
        {
          title: 'Drag',
          latex: 'D = \\tfrac12 \\rho v^2 C_D A',
          prose: `C_D = ${design.cd}, A = ${design.areaM2} m², ρ = ${RHO} kg/m³.`,
        },
        {
          title: 'Integration',
          prose: `Fixed-step ${integrator.toUpperCase()}, Δt = ${config.dt} s, t_max = ${config.tMax} s. Stop on ground contact (h ≤ 0 after launch).`,
        },
        {
          title: 'Results',
          prose: `Max altitude ${summary.maxAltitudeM.toFixed(2)} m at t = ${summary.apogeeTimeS.toFixed(2)} s; max velocity ${summary.maxVelocityMs.toFixed(2)} m/s; flight time ${summary.flightTimeS.toFixed(2)} s.`,
        },
      ];

      return {
        moduleId: this.id,
        data,
        steps,
        series: {
          t: samples.map((s) => s.t),
          altitude: samples.map((s) => s.altitude),
          velocity: samples.map((s) => s.velocity),
        },
      };
    },
  };
