import type { CalcModule, EquationStep, ModuleResult } from '../module.js';
import type {
  DesignComponent,
  RocketDesignSnapshot,
} from '../types.js';

export interface StabilityMarginLiteInput {
  /** Override CG from nose tip (m) */
  cgFromNoseM?: number;
  /** Override body diameter for caliber conversion (m) */
  diameterM?: number;
}

export interface ComponentCpContribution {
  id: string;
  kind: string;
  name?: string;
  /** Estimated CP station from nose tip (m) */
  cpStationM: number;
  /** Relative weight used in weighted CP (arbitrary educational units) */
  weight: number;
  method: string;
}

export interface StabilityMarginLiteData {
  /** Estimated centre of pressure from nose tip (m) */
  cpFromNoseM: number;
  /** Estimated centre of gravity from nose tip (m) */
  cgFromNoseM: number;
  /** Static margin in body calibers: (CP − CG) / D */
  staticMarginCalibers: number;
  /** Static margin in metres: CP − CG (positive ⇒ CP aft of CG) */
  staticMarginM: number;
  diameterM: number;
  lengthM: number | null;
  /** True when CP is aft of CG (classically "statically stable" sign) */
  stableSign: boolean;
  /** How CG was obtained */
  cgSource:
    | 'input-override'
    | 'design.cgFromNoseM'
    | 'components-mass-weighted'
    | 'heuristic-0.4L'
    | 'fallback-midbody';
  /** How CP was obtained */
  cpSource: 'component-weighted' | 'heuristic-0.65L' | 'fallback-midbody';
  contributions: ComponentCpContribution[];
  /** Explicit educational caveats — not a Barrowman solver */
  assumptions: string[];
  notes: string[];
}

function kindOf(c: DesignComponent): string {
  if (c.kind) return c.kind;
  const blob = `${c.id} ${c.name ?? ''}`.toLowerCase();
  if (/\bnose\b|koni|ogive/.test(blob)) return 'nose';
  if (/\bfin|kuyruk|kanat/.test(blob)) return 'fin';
  if (/\bmotor|engine|motor/.test(blob)) return 'motor';
  if (/\bbody|tube|gövde|govde/.test(blob)) return 'body';
  return 'other';
}

function finPlanformAreaM2(c: DesignComponent): number {
  const root = c.rootChordM ?? c.lengthM ?? 0;
  const tip = c.tipChordM ?? root * 0.5;
  const span = c.spanM ?? 0;
  if (!(root > 0) || !(span > 0)) return 0;
  return 0.5 * (root + tip) * span;
}

/**
 * Educational CP station for one component (not full Barrowman).
 *
 * - Nose (cone rule-of-thumb): station + 0.466 × length
 * - Body: station + 0.5 × length, small weight (often neglected in Barrowman)
 * - Fin: station + ~0.25 × mean chord (quarter-chord style placeholder)
 * - Motor/other: geometric mid-station if length known
 */
export function estimateComponentCp(
  c: DesignComponent
): ComponentCpContribution | null {
  const kind = kindOf(c);
  const station = c.stationM;
  const length = c.lengthM ?? 0;

  if (station === undefined || !Number.isFinite(station)) {
    return null;
  }

  if (kind === 'nose') {
    const L = length > 0 ? length : 0;
    const cpStationM = station + 0.466 * L;
    const d = c.diameterM ?? 0;
    // Weight ~ projected “nose influence”: diameter² · length (or diameter²)
    const weight = Math.max(d * d * Math.max(L, d * 0.5), 1e-9);
    return {
      id: c.id,
      kind,
      name: c.name,
      cpStationM,
      weight,
      method: 'conical-nose ≈ 0.466 L from tip of nose component',
    };
  }

  if (kind === 'fin') {
    const root = c.rootChordM ?? length;
    const tip = c.tipChordM ?? (root > 0 ? root * 0.5 : 0);
    const meanChord = root > 0 ? 0.5 * (root + tip) : 0;
    const cpStationM = station + 0.25 * meanChord;
    const n = c.finCount != null && c.finCount > 0 ? c.finCount : 3;
    const area = finPlanformAreaM2(c);
    // Fins dominate subsonic CP; amplify planform × count
    const weight = Math.max(area * n * 4, meanChord * (c.spanM ?? 0) * n, 1e-6);
    return {
      id: c.id,
      kind,
      name: c.name,
      cpStationM,
      weight,
      method: 'fin quarter-chord placeholder (not Barrowman MAC formula)',
    };
  }

  if (kind === 'body') {
    const L = length > 0 ? length : 0;
    const cpStationM = station + 0.5 * L;
    const d = c.diameterM ?? 0;
    // Weak body weight — body lift is small at low angle of attack
    const weight = Math.max(0.05 * d * L, 1e-9);
    return {
      id: c.id,
      kind,
      name: c.name,
      cpStationM,
      weight,
      method: 'body mid-station, low weight (AoA≈0 approximation)',
    };
  }

  // motor / other
  const L = length > 0 ? length : 0;
  const cpStationM = station + 0.5 * L;
  return {
    id: c.id,
    kind,
    name: c.name,
    cpStationM,
    weight: Math.max(0.01 * (c.massKg || 0.01), 1e-9),
    method: 'geometric mid-station (low weight)',
  };
}

/**
 * Mass-weighted CG from component stations (reference at station + half length).
 */
export function estimateCgFromComponents(
  components: DesignComponent[]
): { cgFromNoseM: number; used: number } | null {
  let mSum = 0;
  let mx = 0;
  let used = 0;

  for (const c of components) {
    if (c.stationM === undefined || !Number.isFinite(c.stationM)) continue;
    if (!(c.massKg > 0)) continue;
    const L = c.lengthM != null && c.lengthM > 0 ? c.lengthM : 0;
    const x = c.stationM + 0.5 * L;
    mSum += c.massKg;
    mx += c.massKg * x;
    used += 1;
  }

  if (!(mSum > 0) || used === 0) return null;
  return { cgFromNoseM: mx / mSum, used };
}

function inferLengthM(
  design: RocketDesignSnapshot,
  components: DesignComponent[]
): number | null {
  if (design.lengthM != null && design.lengthM > 0) return design.lengthM;

  let maxEnd = 0;
  let any = false;
  for (const c of components) {
    if (c.stationM === undefined) continue;
    any = true;
    const end = c.stationM + (c.lengthM != null && c.lengthM > 0 ? c.lengthM : 0);
    if (end > maxEnd) maxEnd = end;
  }
  return any && maxEnd > 0 ? maxEnd : null;
}

function inferDiameterM(
  design: RocketDesignSnapshot,
  components: DesignComponent[],
  input?: StabilityMarginLiteInput
): number {
  if (input?.diameterM != null && input.diameterM > 0) return input.diameterM;
  if (design.diameterM != null && design.diameterM > 0) return design.diameterM;

  for (const c of components) {
    if (kindOf(c) === 'body' && c.diameterM != null && c.diameterM > 0) {
      return c.diameterM;
    }
  }
  for (const c of components) {
    if (c.diameterM != null && c.diameterM > 0) return c.diameterM;
  }

  // From reference area A = π D² / 4 if area looks like a circular cross-section
  if (design.areaM2 > 0) {
    const d = Math.sqrt((4 * design.areaM2) / Math.PI);
    if (d > 0 && Number.isFinite(d)) return d;
  }

  return 0.025; // 25 mm class model rocket fallback
}

/**
 * Pure educational stability estimate (CP/CG margin).
 * Documented as approximation — not a full Barrowman implementation.
 */
export function computeStabilityMarginLite(
  design: RocketDesignSnapshot,
  input?: StabilityMarginLiteInput
): StabilityMarginLiteData {
  const components = design.components ?? [];
  const assumptions = [
    'Educational approximation only — NOT a full Barrowman CP method.',
    'Subsonic, small angle of attack; body lift heavily down-weighted.',
    'Fin CP uses a quarter-chord placeholder, not the Barrowman MAC formula.',
    'No interference factors, no boat-tail, no transition geometry.',
    'Positive static margin ⇒ CP aft of CG (classic model-rocket sign convention).',
    'Results are for learning and design intuition, not flight certification.',
  ];
  const notes: string[] = [];

  const lengthM = inferLengthM(design, components);
  const diameterM = inferDiameterM(design, components, input);

  // --- CG ---
  let cgFromNoseM: number;
  let cgSource: StabilityMarginLiteData['cgSource'];

  if (input?.cgFromNoseM != null && Number.isFinite(input.cgFromNoseM)) {
    cgFromNoseM = input.cgFromNoseM;
    cgSource = 'input-override';
  } else if (
    design.cgFromNoseM != null &&
    Number.isFinite(design.cgFromNoseM)
  ) {
    cgFromNoseM = design.cgFromNoseM;
    cgSource = 'design.cgFromNoseM';
  } else {
    const fromParts = estimateCgFromComponents(components);
    if (fromParts) {
      cgFromNoseM = fromParts.cgFromNoseM;
      cgSource = 'components-mass-weighted';
      notes.push(
        `CG from mass-weighted stations of ${fromParts.used} component(s).`
      );
    } else if (lengthM != null) {
      cgFromNoseM = 0.4 * lengthM;
      cgSource = 'heuristic-0.4L';
      notes.push(
        'No CG metadata; used heuristic CG ≈ 0.4 × overall length (typical model-rocket ballpark).'
      );
    } else {
      cgFromNoseM = 0.15;
      cgSource = 'fallback-midbody';
      notes.push(
        'No length/CG data; fell back to CG = 0.15 m (declare design.cgFromNoseM or component stations).'
      );
    }
  }

  // --- CP ---
  const contributions: ComponentCpContribution[] = [];
  for (const c of components) {
    const contrib = estimateComponentCp(c);
    if (contrib) contributions.push(contrib);
  }

  let cpFromNoseM: number;
  let cpSource: StabilityMarginLiteData['cpSource'];

  const wSum = contributions.reduce((s, c) => s + c.weight, 0);
  if (contributions.length > 0 && wSum > 0) {
    cpFromNoseM =
      contributions.reduce((s, c) => s + c.weight * c.cpStationM, 0) / wSum;
    cpSource = 'component-weighted';
    notes.push(
      `CP from ${contributions.length} component contribution(s) with educational weights.`
    );
  } else if (lengthM != null) {
    // Rule of thumb: CP near ~65% of length for many simple 3FNC rockets
    cpFromNoseM = 0.65 * lengthM;
    cpSource = 'heuristic-0.65L';
    notes.push(
      'No station geometry on components; used heuristic CP ≈ 0.65 × overall length.'
    );
  } else {
    cpFromNoseM = 0.2;
    cpSource = 'fallback-midbody';
    notes.push(
      'No geometry; fell back to CP = 0.2 m. Provide component stationM/lengthM or design.lengthM.'
    );
  }

  const staticMarginM = cpFromNoseM - cgFromNoseM;
  const staticMarginCalibers =
    diameterM > 0 ? staticMarginM / diameterM : staticMarginM;

  // Prefer mass.properties total if we only need notes consistency later
  if (components.length === 0) {
    notes.push(
      'No components on snapshot — margin is geometry/heuristic only.'
    );
  }

  return {
    cpFromNoseM,
    cgFromNoseM,
    staticMarginCalibers,
    staticMarginM,
    diameterM,
    lengthM,
    stableSign: staticMarginM > 0,
    cgSource,
    cpSource,
    contributions,
    assumptions,
    notes,
  };
}

/**
 * Free module: lightweight stability (CP/CG) margin estimate.
 * CLEAR educational assumptions — not full Barrowman.
 */
export const stabilityMarginLiteModule: CalcModule<
  StabilityMarginLiteInput | undefined,
  StabilityMarginLiteData
> = {
  id: 'stability.margin-lite',
  title: {
    en: 'Stability margin (lite)',
    tr: 'Kararlılık marjı (basit)',
  },
  tier: 'free',
  references: [
    'Barrowman, J. — The Practical Calculation of the Aerodynamic Characteristics of Slender Finned Vehicles (full method deferred to pro/future module)',
    'Mandell, Caporaso, Bengen — Topics in Advanced Model Rocketry (stability margin concept)',
    'NAR / model-rocket practice: static margin in body calibers ≈ (X_CP − X_CG) / D',
  ],

  run(input, ctx): ModuleResult<StabilityMarginLiteData> {
    const data = computeStabilityMarginLite(ctx.design, input);

    const steps: EquationStep[] = [
      {
        title: 'Assumptions (read carefully)',
        prose: data.assumptions.join(' '),
      },
      {
        title: 'Centre of gravity',
        latex: 'x_{CG} = \\frac{\\sum_i m_i x_i}{\\sum_i m_i}',
        prose:
          data.cgSource === 'components-mass-weighted'
            ? `CG from mass-weighted component stations: x_CG = ${data.cgFromNoseM.toFixed(4)} m from nose tip.`
            : data.cgSource === 'design.cgFromNoseM'
              ? `CG taken from design.cgFromNoseM: x_CG = ${data.cgFromNoseM.toFixed(4)} m.`
              : data.cgSource === 'input-override'
                ? `CG from module input override: x_CG = ${data.cgFromNoseM.toFixed(4)} m.`
                : `CG heuristic (${data.cgSource}): x_CG = ${data.cgFromNoseM.toFixed(4)} m.`,
      },
      {
        title: 'Centre of pressure (lite)',
        latex:
          'x_{CP} \\approx \\frac{\\sum_j w_j x_{CP,j}}{\\sum_j w_j}\\quad(\\text{educational weights } w_j)',
        prose:
          data.cpSource === 'component-weighted'
            ? `Weighted CP from nose/body/fin placeholders: x_CP = ${data.cpFromNoseM.toFixed(4)} m. Fin uses quarter-chord-style station; nose uses ≈0.466 L cone rule-of-thumb.`
            : `CP heuristic (${data.cpSource}): x_CP = ${data.cpFromNoseM.toFixed(4)} m.`,
      },
      {
        title: 'Static margin',
        latex:
          '\\mathrm{SM} = \\frac{x_{CP} - x_{CG}}{D}\\quad[\\text{calibers}]',
        prose: `SM = (${data.cpFromNoseM.toFixed(4)} − ${data.cgFromNoseM.toFixed(4)}) / ${data.diameterM.toFixed(4)} = ${data.staticMarginCalibers.toFixed(3)} cal (${data.staticMarginM.toFixed(4)} m). ${
          data.stableSign
            ? 'Sign is positive (CP aft of CG) — classically the stable direction.'
            : 'Sign is non-positive (CP at or forward of CG) — classically unstable / marginal; redesign fins or mass distribution.'
        }`,
      },
    ];

    if (data.contributions.length > 0) {
      steps.push({
        title: 'Component CP contributions',
        prose: data.contributions
          .map(
            (c) =>
              `${c.name ?? c.id} [${c.kind}]: x_CP≈${c.cpStationM.toFixed(4)} m, w=${c.weight.toExponential(2)} (${c.method})`
          )
          .join('; '),
      });
    }

    if (data.notes.length > 0) {
      steps.push({
        title: 'Notes',
        prose: data.notes.join(' '),
      });
    }

    ctx.emit?.({
      type: 'stability.margin.resolved',
      payload: {
        staticMarginCalibers: data.staticMarginCalibers,
        stableSign: data.stableSign,
      },
    });

    return {
      moduleId: this.id,
      data,
      steps,
    };
  },
};
