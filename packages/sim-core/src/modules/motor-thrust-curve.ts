import type { CalcModule, EquationStep, ModuleResult } from '../module.js';
import type { RocketDesignSnapshot } from '../types.js';

/** One thrust-time sample: t in seconds, n thrust in newtons. */
export interface ThrustSample {
  t: number;
  n: number;
}

export interface MotorThrustCurveInput {
  /** Explicit samples override metadata / rectangle fallback */
  samples?: ThrustSample[];
  /** Constant thrust for rectangle fallback (N) */
  thrustN?: number;
  /** Burn duration for rectangle fallback (s) */
  burnTimeS?: number;
}

export type ThrustCurveSource =
  | 'input.samples'
  | 'metadata.thrustCurve'
  | 'rectangle';

export interface MotorThrustCurveData {
  /** Total impulse I = ∫ T dt via trapezoidal rule (N·s) */
  impulseNs: number;
  /** Average thrust = I / t_burn (N) */
  averageThrustN: number;
  /** Burn duration used for averages (s) */
  burnTimeS: number;
  /** Ordered thrust samples (t, n) */
  samples: ThrustSample[];
  /** Peak thrust max(T) (N) */
  peakThrustN: number;
  /** Where the curve came from */
  source: ThrustCurveSource;
}

/** Design may carry free-form metadata (thrustCurve) not yet on the snapshot type. */
type DesignWithMetadata = RocketDesignSnapshot & {
  metadata?: Record<string, unknown>;
};

/**
 * Sort and validate thrust samples. Rejects non-finite values, negative thrust,
 * and strictly decreasing time.
 */
export function normalizeThrustSamples(raw: ThrustSample[]): ThrustSample[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    throw new Error('motor.thrust-curve: thrust samples must be a non-empty array');
  }

  const samples: ThrustSample[] = raw.map((s, i) => {
    if (s == null || typeof s !== 'object') {
      throw new Error(`motor.thrust-curve: sample[${i}] must be an object {t, n}`);
    }
    const t = Number((s as ThrustSample).t);
    const n = Number((s as ThrustSample).n);
    if (!Number.isFinite(t)) {
      throw new Error(`motor.thrust-curve: sample[${i}].t must be finite`);
    }
    if (!Number.isFinite(n) || n < 0) {
      throw new Error(`motor.thrust-curve: sample[${i}].n must be finite and ≥ 0`);
    }
    return { t, n };
  });

  samples.sort((a, b) => a.t - b.t);

  for (let i = 1; i < samples.length; i++) {
    if (samples[i]!.t < samples[i - 1]!.t) {
      throw new Error('motor.thrust-curve: sample times must be non-decreasing');
    }
  }

  return samples;
}

/**
 * Parse unknown metadata payload into thrust samples.
 * Accepts Array<{t,n}> only (strict educational shape).
 */
export function parseThrustCurve(raw: unknown): ThrustSample[] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null;
  const out: ThrustSample[] = [];
  for (const item of raw) {
    if (item == null || typeof item !== 'object') return null;
    const rec = item as Record<string, unknown>;
    if (!('t' in rec) || !('n' in rec)) return null;
    const t = Number(rec.t);
    const n = Number(rec.n);
    if (!Number.isFinite(t) || !Number.isFinite(n)) return null;
    out.push({ t, n });
  }
  return normalizeThrustSamples(out);
}

/**
 * Constant-thrust rectangle: T(t) = thrustN for 0 ≤ t ≤ burnTimeS.
 * Represented by two samples so trapz recovers I = T · t_b exactly.
 */
export function rectangleThrustCurve(
  thrustN: number,
  burnTimeS: number
): ThrustSample[] {
  if (!(Number.isFinite(thrustN) && thrustN >= 0)) {
    throw new Error('motor.thrust-curve: thrustN must be finite and ≥ 0');
  }
  if (!(Number.isFinite(burnTimeS) && burnTimeS >= 0)) {
    throw new Error('motor.thrust-curve: burnTimeS must be finite and ≥ 0');
  }
  if (burnTimeS === 0) {
    return [
      { t: 0, n: thrustN },
      { t: 0, n: thrustN },
    ];
  }
  return [
    { t: 0, n: thrustN },
    { t: burnTimeS, n: thrustN },
  ];
}

/**
 * Composite trapezoidal rule: I ≈ Σ (T_i + T_{i+1})/2 · Δt_i
 * Matches NAR/TRA total-impulse practice on digitized thrust tables.
 */
export function trapezoidalImpulse(samples: ThrustSample[]): number {
  if (samples.length < 2) {
    return 0;
  }
  let impulse = 0;
  for (let i = 0; i < samples.length - 1; i++) {
    const a = samples[i]!;
    const b = samples[i + 1]!;
    const dt = b.t - a.t;
    if (dt < 0) {
      throw new Error('motor.thrust-curve: sample times must be non-decreasing');
    }
    impulse += 0.5 * (a.n + b.n) * dt;
  }
  return impulse;
}

/** Peak thrust on the table (N). */
export function peakThrust(samples: ThrustSample[]): number {
  if (samples.length === 0) return 0;
  let peak = samples[0]!.n;
  for (let i = 1; i < samples.length; i++) {
    if (samples[i]!.n > peak) peak = samples[i]!.n;
  }
  return peak;
}

/**
 * Burn span of the table: last t − first t (s).
 * Educational simplification — full NAR 5%-of-peak burn detection is pro-tier.
 */
export function burnSpanS(samples: ThrustSample[]): number {
  if (samples.length === 0) return 0;
  return samples[samples.length - 1]!.t - samples[0]!.t;
}

/**
 * Piecewise-linear thrust interpolation at time t (s).
 * Clamped outside [t0, tN]: uses endpoint thrust (no extrapolation ramp).
 */
export function interpolateThrust(samples: ThrustSample[], t: number): number {
  const s = normalizeThrustSamples(samples);
  if (!Number.isFinite(t)) {
    throw new Error('motor.thrust-curve: t must be finite');
  }
  if (s.length === 1) return s[0]!.n;
  if (t <= s[0]!.t) return s[0]!.n;
  const last = s[s.length - 1]!;
  if (t >= last.t) return last.n;

  for (let i = 0; i < s.length - 1; i++) {
    const a = s[i]!;
    const b = s[i + 1]!;
    if (t >= a.t && t <= b.t) {
      const dt = b.t - a.t;
      if (dt === 0) return a.n;
      const u = (t - a.t) / dt;
      return a.n + u * (b.n - a.n);
    }
  }
  return last.n;
}

/**
 * Pure motor thrust-curve summary: impulse, averages, peak, samples.
 */
export function computeMotorThrustCurve(opts: {
  samples?: ThrustSample[];
  thrustN?: number;
  burnTimeS?: number;
  sourceHint?: ThrustCurveSource;
}): MotorThrustCurveData {
  let samples: ThrustSample[];
  let source: ThrustCurveSource;

  if (opts.samples != null && opts.samples.length > 0) {
    samples = normalizeThrustSamples(opts.samples);
    source = opts.sourceHint ?? 'input.samples';
  } else {
    const thrustN = opts.thrustN ?? 0;
    const burnTimeS = opts.burnTimeS ?? 0;
    samples = rectangleThrustCurve(thrustN, burnTimeS);
    source = 'rectangle';
  }

  const impulseNs = trapezoidalImpulse(samples);
  const burnTimeS = burnSpanS(samples);
  const peakThrustN = peakThrust(samples);
  const averageThrustN = burnTimeS > 0 ? impulseNs / burnTimeS : peakThrustN;

  return {
    impulseNs,
    averageThrustN,
    burnTimeS,
    samples: samples.map((s) => ({ t: s.t, n: s.n })),
    peakThrustN,
    source,
  };
}

function resolveCurve(
  input: MotorThrustCurveInput | undefined,
  design: RocketDesignSnapshot
): { samples: ThrustSample[]; source: ThrustCurveSource; thrustN: number; burnTimeS: number } {
  if (input?.samples != null && input.samples.length > 0) {
    return {
      samples: normalizeThrustSamples(input.samples),
      source: 'input.samples',
      thrustN: input.thrustN ?? design.thrustN,
      burnTimeS: input.burnTimeS ?? design.burnTimeS,
    };
  }

  const meta = (design as DesignWithMetadata).metadata;
  const parsed = parseThrustCurve(meta?.thrustCurve);
  if (parsed != null) {
    return {
      samples: parsed,
      source: 'metadata.thrustCurve',
      thrustN: input?.thrustN ?? design.thrustN,
      burnTimeS: input?.burnTimeS ?? design.burnTimeS,
    };
  }

  const thrustN = input?.thrustN ?? design.thrustN;
  const burnTimeS = input?.burnTimeS ?? design.burnTimeS;
  return {
    samples: rectangleThrustCurve(thrustN, burnTimeS),
    source: 'rectangle',
    thrustN,
    burnTimeS,
  };
}

/**
 * Free module: thrust curve → total impulse, average/peak thrust, sample table.
 * Educational NAR/TRA-style digitised curve practice (no GPL code).
 */
export const motorThrustCurveModule: CalcModule<
  MotorThrustCurveInput | undefined,
  MotorThrustCurveData
> = {
  id: 'motor.thrust-curve',
  title: {
    en: 'Motor thrust curve',
    tr: 'Motor itki eğrisi',
  },
  tier: 'free',
  references: [
    'NAR Standards & Testing — total impulse I = ∫ T dt from thrust–time curves',
    'Tripoli Rocketry Association (TRA) motor certification practice — average thrust = I / t_burn',
    'NFPA 1125 / model-rocket motor classification by total impulse (educational summary)',
    'Trapezoidal (composite) quadrature on tabulated thrust samples',
  ],

  run(input, ctx): ModuleResult<MotorThrustCurveData> {
    const design = ctx.design;
    const resolved = resolveCurve(input, design);
    const data = computeMotorThrustCurve({
      samples: resolved.samples,
      thrustN: resolved.thrustN,
      burnTimeS: resolved.burnTimeS,
      sourceHint: resolved.source,
    });

    const steps: EquationStep[] = [
      {
        title: 'Assumptions',
        prose:
          resolved.source === 'rectangle'
            ? `Constant thrust rectangle: T(t) = ${resolved.thrustN} N for 0 ≤ t ≤ ${resolved.burnTimeS} s (no measured curve). Propellant mass flow neglected; thrust table is force-only.`
            : resolved.source === 'metadata.thrustCurve'
              ? `Thrust–time table from design.metadata.thrustCurve (${data.samples.length} samples). Piecewise-linear between points; impulse via trapezoidal rule. Not a certified NAR/TRA lab reduction (no 5%-of-peak burn trim).`
              : `Thrust–time table from module input (${data.samples.length} samples). Piecewise-linear between points; impulse via trapezoidal rule.`,
      },
      {
        title: 'Total impulse',
        latex: 'I = \\int_{t_0}^{t_b} T(t)\\,\\mathrm{d}t \\approx \\sum_{i} \\frac{T_i + T_{i+1}}{2}\\Delta t_i',
        prose: `Composite trapezoidal rule on the sample table: I = ${data.impulseNs.toFixed(4)} N·s.`,
      },
      {
        title: 'Average thrust',
        latex: 'T_{\\mathrm{avg}} = I / t_{b}',
        prose:
          data.burnTimeS > 0
            ? `t_b = ${data.burnTimeS.toFixed(4)} s (table span), T_avg = ${data.impulseNs.toFixed(4)} / ${data.burnTimeS.toFixed(4)} = ${data.averageThrustN.toFixed(4)} N.`
            : `Zero burn span; T_avg reported as peak thrust ${data.averageThrustN.toFixed(4)} N.`,
      },
      {
        title: 'Peak thrust',
        latex: 'T_{\\mathrm{peak}} = \\max_i T_i',
        prose: `Peak sample thrust T_peak = ${data.peakThrustN.toFixed(4)} N.`,
      },
      {
        title: 'Source',
        prose: `Curve source: ${data.source}.`,
      },
    ];

    ctx.emit?.({
      type: 'motor.thrust-curve.resolved',
      payload: {
        impulseNs: data.impulseNs,
        averageThrustN: data.averageThrustN,
        peakThrustN: data.peakThrustN,
        burnTimeS: data.burnTimeS,
        source: data.source,
      },
    });

    return {
      moduleId: this.id,
      data,
      steps,
      series: {
        t: data.samples.map((s) => s.t),
        thrustN: data.samples.map((s) => s.n),
      },
    };
  },
};
