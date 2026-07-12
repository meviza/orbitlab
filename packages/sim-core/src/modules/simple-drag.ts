import type { CalcModule, EquationStep, ModuleResult } from '../module.js';
import { SEA_LEVEL_RHO_KG_M3, type RocketDesignSnapshot } from '../types.js';

/** Default sample speed when design does not provide velocitySampleMs (m/s). */
export const DEFAULT_VELOCITY_SAMPLE_MS = 40;

export interface SimpleDragInput {
  /** Override freestream velocity sample (m/s) */
  velocityMs?: number;
  /** Override Cd */
  cd?: number;
  /** Override reference area (m²) */
  areaM2?: number;
  /** Override air density (kg/m³) */
  rhoKgM3?: number;
}

export interface SimpleDragData {
  cd: number;
  areaM2: number;
  velocityMs: number;
  rhoKgM3: number;
  /** Dynamic pressure q = ½ ρ v² (Pa) */
  dynamicPressurePa: number;
  /** Drag force D = q Cd A (N) */
  dragForceN: number;
  /** Drag acceleration magnitude at this sample if mass known (m/s²) */
  dragAccelMs2: number | null;
  massKg: number | null;
}

/**
 * Pure quadratic-drag summary at a single velocity sample.
 * Educational free-tier aero module — not a Mach-dependent Cd table.
 */
export function computeSimpleDrag(opts: {
  cd: number;
  areaM2: number;
  velocityMs: number;
  rhoKgM3?: number;
  massKg?: number | null;
}): SimpleDragData {
  const rhoKgM3 = opts.rhoKgM3 ?? SEA_LEVEL_RHO_KG_M3;
  const { cd, areaM2, velocityMs } = opts;

  if (!(cd >= 0) || !Number.isFinite(cd)) {
    throw new Error('aero.simple-drag: cd must be a finite number ≥ 0');
  }
  if (!(areaM2 > 0) || !Number.isFinite(areaM2)) {
    throw new Error('aero.simple-drag: areaM2 must be finite and > 0');
  }
  if (!(velocityMs >= 0) || !Number.isFinite(velocityMs)) {
    throw new Error('aero.simple-drag: velocityMs must be a finite number ≥ 0');
  }
  if (!(rhoKgM3 > 0) || !Number.isFinite(rhoKgM3)) {
    throw new Error('aero.simple-drag: rhoKgM3 must be finite and > 0');
  }

  const dynamicPressurePa = 0.5 * rhoKgM3 * velocityMs * velocityMs;
  const dragForceN = dynamicPressurePa * cd * areaM2;
  const massKg =
    opts.massKg != null && Number.isFinite(opts.massKg) && opts.massKg > 0
      ? opts.massKg
      : null;
  const dragAccelMs2 = massKg != null ? dragForceN / massKg : null;

  return {
    cd,
    areaM2,
    velocityMs,
    rhoKgM3,
    dynamicPressurePa,
    dragForceN,
    dragAccelMs2,
    massKg,
  };
}

/**
 * Free module: algebraic drag force / coefficient summary from design snapshot.
 * Emits LaTeX + prose steps for the report engine.
 */
export const simpleDragModule: CalcModule<
  SimpleDragInput | undefined,
  SimpleDragData
> = {
  id: 'aero.simple-drag',
  title: {
    en: 'Simple drag summary',
    tr: 'Basit sürükleme özeti',
  },
  tier: 'free',
  references: [
    'Anderson, Fundamentals of Aerodynamics — dynamic pressure q = ½ ρ v²',
    'Quadratic drag model D = ½ ρ v² C_D A (incompressible / low-Mach form)',
    'ISA sea-level ρ ≈ 1.225 kg/m³',
  ],

  run(input, ctx): ModuleResult<SimpleDragData> {
    const design: RocketDesignSnapshot = ctx.design;
    const massResult = ctx.previous.get('mass.properties');
    const massFromPrev = (
      massResult?.data as { totalMassKg?: number } | undefined
    )?.totalMassKg;

    const cd = input?.cd ?? design.cd;
    const areaM2 = input?.areaM2 ?? design.areaM2;
    const velocityMs =
      input?.velocityMs ??
      design.velocitySampleMs ??
      DEFAULT_VELOCITY_SAMPLE_MS;
    const rhoKgM3 =
      input?.rhoKgM3 ?? design.rhoKgM3 ?? SEA_LEVEL_RHO_KG_M3;
    const massKg =
      massFromPrev ??
      (design.massKg > 0 ? design.massKg : null);

    const data = computeSimpleDrag({
      cd,
      areaM2,
      velocityMs,
      rhoKgM3,
      massKg,
    });

    const steps: EquationStep[] = [
      {
        title: 'Assumptions',
        prose:
          'Constant C_D (no Mach/Re table), incompressible quadratic drag, uniform freestream at a single sample speed, sea-level density unless overridden. This is an educational force check, not a full aerodynamic database.',
      },
      {
        title: 'Dynamic pressure',
        latex: 'q = \\tfrac12 \\rho v^2',
        prose: `q = ½ × ${rhoKgM3.toFixed(3)} × (${velocityMs.toFixed(2)})² = ${data.dynamicPressurePa.toFixed(2)} Pa.`,
      },
      {
        title: 'Drag force',
        latex: 'D = q\\, C_D\\, A = \\tfrac12 \\rho v^2 C_D A',
        prose: `D = ${data.dynamicPressurePa.toFixed(2)} × ${cd.toFixed(3)} × ${areaM2.toExponential(4)} = ${data.dragForceN.toFixed(4)} N at v = ${velocityMs.toFixed(2)} m/s.`,
      },
      {
        title: 'Inputs',
        prose: `C_D = ${cd.toFixed(3)}, A = ${areaM2} m², ρ = ${rhoKgM3} kg/m³, v_sample = ${velocityMs} m/s.`,
      },
    ];

    if (data.massKg != null && data.dragAccelMs2 != null) {
      steps.push({
        title: 'Drag acceleration (sample)',
        latex: 'a_D = D / m',
        prose: `With m = ${data.massKg.toFixed(4)} kg, |a_D| = ${data.dragAccelMs2.toFixed(3)} m/s² at this sample speed (direction opposes velocity in flight).`,
      });
    }

    ctx.emit?.({
      type: 'aero.drag.resolved',
      payload: {
        dragForceN: data.dragForceN,
        dynamicPressurePa: data.dynamicPressurePa,
      },
    });

    return {
      moduleId: this.id,
      data,
      steps,
    };
  },
};
