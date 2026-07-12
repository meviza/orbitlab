import type { CalcModule, EquationStep, ModuleResult } from '../module.js';
import type {
  DesignComponent,
  RocketDesignSnapshot,
} from '../types.js';

/**
 * Educational Barrowman-class static-stability module.
 *
 * Implements a *simplified* Barrowman centre-of-pressure estimate for a
 * classic 3FNC-style stack (nose + cylindrical body + trapezoidal fin set).
 * Documented as an educational approximation — not a flight-certification tool.
 *
 * References are textbooks / public method descriptions only (no GPL code).
 */

export interface StabilityBarrowmanInput {
  /** Override CG from nose tip (m) */
  cgFromNoseM?: number;
  /** Override reference body diameter for caliber conversion (m) */
  diameterM?: number;
  /**
   * Nose shape used for the CP station formula.
   * - `ogive` (default educational): X̄_n ≈ 0.466 L_n
   * - `cone`: classic slender cone X̄_n = (2/3) L_n ≈ 0.666 L_n
   */
  noseShape?: 'cone' | 'ogive';
}

export interface BarrowmanPartContribution {
  id: string;
  kind: string;
  name?: string;
  /** Normal-force slope contribution C_Nα (per radian, educational units) */
  cnAlpha: number;
  /** CP station of this part from nose tip (m) */
  cpStationM: number;
  method: string;
}

export interface StabilityBarrowmanData {
  /** Centre of gravity from nose tip (m) */
  cgFromNoseM: number;
  /** Centre of pressure from nose tip (m) */
  cpFromNoseM: number;
  /** Reference body diameter / caliber (m) */
  caliberM: number;
  /** Static margin in calibers: (CP − CG) / caliber */
  stabilityCalibers: number;
  /** Static margin in metres: CP − CG */
  staticMarginM: number;
  /** Overall C_Nα (sum of contributions) */
  cnAlphaTotal: number;
  /** True when CP is aft of CG (classic stable sign) */
  stableSign: boolean;
  lengthM: number | null;
  noseShape: 'cone' | 'ogive';
  cgSource:
    | 'input-override'
    | 'design.cgFromNoseM'
    | 'components-mass-weighted'
    | 'heuristic-0.4L'
    | 'fallback-midbody';
  cpSource: 'barrowman-weighted' | 'heuristic-0.65L' | 'fallback-midbody';
  contributions: BarrowmanPartContribution[];
  assumptions: string[];
  notes: string[];
}

const DEFAULT_DIAMETER_M = 0.025;
const NOSE_CP_FRAC_OGIVE = 0.466;
const NOSE_CP_FRAC_CONE = 2 / 3;

function kindOf(c: DesignComponent): string {
  if (c.kind) return c.kind;
  const blob = `${c.id} ${c.name ?? ''}`.toLowerCase();
  if (/\bnose\b|koni|ogive/.test(blob)) return 'nose';
  if (/\bfin|kuyruk|kanat/.test(blob)) return 'fin';
  if (/\bmotor|engine|motor/.test(blob)) return 'motor';
  if (/\bbody|tube|gövde|govde/.test(blob)) return 'body';
  return 'other';
}

/** Axial station of component reference from nose tip (m). */
function stationOf(c: DesignComponent): number | undefined {
  if (c.stationM !== undefined && Number.isFinite(c.stationM)) {
    return c.stationM;
  }
  // Alias sometimes used by app-layer snapshots
  const meta = c.metadata;
  if (meta && typeof meta.stationFromNoseM === 'number') {
    return meta.stationFromNoseM;
  }
  return undefined;
}

function finRootChord(c: DesignComponent): number {
  if (c.rootChordM != null && c.rootChordM > 0) return c.rootChordM;
  const meta = c.metadata;
  if (meta && typeof meta.finRootChordM === 'number' && meta.finRootChordM > 0) {
    return meta.finRootChordM;
  }
  if (c.lengthM != null && c.lengthM > 0) return c.lengthM;
  return 0;
}

function finTipChord(c: DesignComponent, root: number): number {
  if (c.tipChordM != null && c.tipChordM > 0) return c.tipChordM;
  const meta = c.metadata;
  if (meta && typeof meta.finTipChordM === 'number' && meta.finTipChordM > 0) {
    return meta.finTipChordM;
  }
  // Rectangular default when tip omitted
  return root > 0 ? root : 0;
}

function finSpan(c: DesignComponent): number {
  if (c.spanM != null && c.spanM > 0) return c.spanM;
  const meta = c.metadata;
  if (meta && typeof meta.finSpanM === 'number' && meta.finSpanM > 0) {
    return meta.finSpanM;
  }
  return 0;
}

function finSweep(c: DesignComponent): number {
  if (c.sweepM != null && Number.isFinite(c.sweepM) && c.sweepM >= 0) {
    return c.sweepM;
  }
  const meta = c.metadata;
  if (meta && typeof meta.finSweepM === 'number' && meta.finSweepM >= 0) {
    return meta.finSweepM;
  }
  return 0;
}

function finCountOf(c: DesignComponent): number {
  if (c.finCount != null && c.finCount > 0) return c.finCount;
  return 3;
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
    const station = stationOf(c);
    if (station === undefined || !Number.isFinite(station)) continue;
    if (!(c.massKg > 0)) continue;
    const L = c.lengthM != null && c.lengthM > 0 ? c.lengthM : 0;
    const x = station + 0.5 * L;
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
    const station = stationOf(c);
    if (station === undefined) continue;
    any = true;
    const end = station + (c.lengthM != null && c.lengthM > 0 ? c.lengthM : 0);
    if (end > maxEnd) maxEnd = end;
  }
  return any && maxEnd > 0 ? maxEnd : null;
}

function inferCaliberM(
  design: RocketDesignSnapshot,
  components: DesignComponent[],
  input?: StabilityBarrowmanInput
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

  if (design.areaM2 > 0) {
    const d = Math.sqrt((4 * design.areaM2) / Math.PI);
    if (d > 0 && Number.isFinite(d)) return d;
  }

  return DEFAULT_DIAMETER_M;
}

/**
 * Conical / ogive nose contribution (classic Barrowman slender-body).
 * C_Nα_n = 2; X̄_n = k · L_n from the tip of the nose component.
 */
export function noseBarrowmanContribution(
  c: DesignComponent,
  noseShape: 'cone' | 'ogive'
): BarrowmanPartContribution | null {
  const station = stationOf(c);
  if (station === undefined) return null;

  const L =
    c.lengthM != null && c.lengthM > 0
      ? c.lengthM
      : // Sensible demo default: ~3 calibers if diameter known
        (c.diameterM != null && c.diameterM > 0 ? 3 * c.diameterM : 0.08);

  const k = noseShape === 'cone' ? NOSE_CP_FRAC_CONE : NOSE_CP_FRAC_OGIVE;
  const cpStationM = station + k * L;

  return {
    id: c.id,
    kind: 'nose',
    name: c.name,
    cnAlpha: 2,
    cpStationM,
    method:
      noseShape === 'cone'
        ? `conical nose: C_Nα=2, X̄_n=(2/3)L_n (L_n=${L.toFixed(4)} m)`
        : `ogive nose (educational default): C_Nα=2, X̄_n=0.466 L_n (L_n=${L.toFixed(4)} m)`,
  };
}

/**
 * Cylindrical body: classic Barrowman assigns no C_Nα at small AoA
 * (body volume is used only for caliber / area bookkeeping elsewhere).
 */
export function bodyBarrowmanContribution(
  c: DesignComponent
): BarrowmanPartContribution | null {
  const station = stationOf(c);
  if (station === undefined) return null;
  const L = c.lengthM != null && c.lengthM > 0 ? c.lengthM : 0;
  return {
    id: c.id,
    kind: 'body',
    name: c.name,
    cnAlpha: 0,
    cpStationM: station + 0.5 * L,
    method:
      'cylindrical body: C_Nα≈0 in classic Barrowman (axial flow / small AoA)',
  };
}

/**
 * Trapezoidal / rectangular fin-set contribution (simplified Barrowman).
 *
 * (C_Nα)_f = (1 + R/(S+R)) · [4 N (S/d)²] / [1 + √(1 + (2 L_f /(C_r+C_t))²)]
 *
 * X̄_f (from root LE) =
 *   X_t (C_r + 2 C_t) / [3 (C_r + C_t)]
 *   + (1/6) [ C_r + C_t − C_r C_t / (C_r + C_t) ]
 *
 * where L_f is the mid-chord line length and X_t is LE sweep distance.
 */
export function finBarrowmanContribution(
  c: DesignComponent,
  bodyDiameterM: number
): BarrowmanPartContribution | null {
  const station = stationOf(c);
  if (station === undefined) return null;

  const d = bodyDiameterM > 0 ? bodyDiameterM : DEFAULT_DIAMETER_M;
  const R = d / 2;
  const Cr = finRootChord(c);
  const Ct = finTipChord(c, Cr);
  // Demo defaults when fin geometry is sparse
  const S = finSpan(c) > 0 ? finSpan(c) : Math.max(d * 1.5, 0.03);
  const root = Cr > 0 ? Cr : Math.max(d * 2, 0.04);
  const tip = Ct > 0 ? Ct : root * 0.5;
  const N = finCountOf(c);
  const Xt = finSweep(c);

  // Mid-chord line length
  const midChordSweep = Xt + (tip - root) / 2;
  const Lf = Math.sqrt(S * S + midChordSweep * midChordSweep);

  const sumChord = root + tip;
  if (!(sumChord > 0) || !(S > 0) || !(d > 0)) {
    return null;
  }

  const interference = 1 + R / (S + R); // K_fb body-on-fin
  const aspectTerm = (2 * Lf) / sumChord;
  const denom = 1 + Math.sqrt(1 + aspectTerm * aspectTerm);
  const cnAlpha =
    (interference * (4 * N * (S / d) * (S / d))) / denom;

  // CP of fin planform from root leading edge
  const cpFromRootLe =
    (Xt * (root + 2 * tip)) / (3 * sumChord) +
    (1 / 6) * (root + tip - (root * tip) / sumChord);

  const cpStationM = station + cpFromRootLe;

  return {
    id: c.id,
    kind: 'fin',
    name: c.name,
    cnAlpha,
    cpStationM,
    method: `trapezoidal fin set N=${N}: Barrowman C_Nα with K_fb=${interference.toFixed(3)}, L_f=${Lf.toFixed(4)} m, X̄ from root LE=${cpFromRootLe.toFixed(4)} m`,
  };
}

/**
 * Pure educational Barrowman-class CP / CG margin.
 */
export function computeStabilityBarrowman(
  design: RocketDesignSnapshot,
  input?: StabilityBarrowmanInput
): StabilityBarrowmanData {
  const components = design.components ?? [];
  const noseShape: 'cone' | 'ogive' = input?.noseShape ?? 'ogive';

  const assumptions = [
    'Educational Barrowman-class approximation — not flight certification.',
    'Subsonic, rigid airframe, small angle of attack; slender-body normal-force theory.',
    'Cylindrical body contributes C_Nα ≈ 0 (classic Barrowman axial-flow result).',
    noseShape === 'cone'
      ? 'Nose treated as cone: X̄_n = (2/3) L_n, C_Nα_n = 2.'
      : 'Nose treated as ogive (default educational): X̄_n = 0.466 L_n, C_Nα_n = 2. Cone option available via noseShape input.',
    'Fin set uses simplified trapezoidal Barrowman formulas with body-on-fin interference K_fb = 1 + R/(S+R).',
    'No boat-tail, no transitions, no fin thickness / Mach corrections, no protuberances.',
    'Positive stabilityCalibers ⇒ CP aft of CG (classic model-rocket sign).',
    'OpenRocket / GPL implementations were not consulted; formulas from public Barrowman method descriptions only.',
  ];
  const notes: string[] = [];

  const lengthM = inferLengthM(design, components);
  const caliberM = inferCaliberM(design, components, input);

  // --- CG ---
  let cgFromNoseM: number;
  let cgSource: StabilityBarrowmanData['cgSource'];

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

  // --- CP (Barrowman weighted by C_Nα) ---
  const contributions: BarrowmanPartContribution[] = [];
  let hasNose = false;
  let hasFin = false;

  for (const c of components) {
    const kind = kindOf(c);
    if (kind === 'nose') {
      const part = noseBarrowmanContribution(c, noseShape);
      if (part) {
        contributions.push(part);
        hasNose = true;
      }
    } else if (kind === 'body') {
      const part = bodyBarrowmanContribution(c);
      if (part) contributions.push(part);
    } else if (kind === 'fin') {
      const part = finBarrowmanContribution(c, caliberM);
      if (part) {
        contributions.push(part);
        hasFin = true;
      }
    }
    // motor / other: no C_Nα in this free educational model
  }

  // Synthesize a default nose if none present but we have length (demo-friendly)
  if (!hasNose && lengthM != null && lengthM > 0) {
    const Ln = Math.min(0.15 * lengthM, 3 * caliberM);
    const synthetic: DesignComponent = {
      id: 'synthetic-nose',
      name: 'Synthetic nose (default)',
      kind: 'nose',
      massKg: 0,
      stationM: 0,
      lengthM: Ln > 0 ? Ln : 0.08,
      diameterM: caliberM,
    };
    const part = noseBarrowmanContribution(synthetic, noseShape);
    if (part) {
      contributions.push(part);
      notes.push(
        `No nose component; synthesized educational nose L_n=${synthetic.lengthM!.toFixed(4)} m at tip.`
      );
    }
  }

  // Synthesize a minimal fin set aft if missing (so demos still produce a CP)
  if (!hasFin && lengthM != null && lengthM > 0) {
    const synthetic: DesignComponent = {
      id: 'synthetic-fins',
      name: 'Synthetic fins (default)',
      kind: 'fin',
      massKg: 0,
      stationM: Math.max(lengthM - 2.5 * caliberM, 0.5 * lengthM),
      rootChordM: 2 * caliberM,
      tipChordM: caliberM,
      spanM: 1.5 * caliberM,
      sweepM: 0,
      finCount: 3,
    };
    const part = finBarrowmanContribution(synthetic, caliberM);
    if (part) {
      contributions.push(part);
      notes.push(
        'No fin component; synthesized educational 3-fin set near the aft end so CP is defined.'
      );
    }
  }

  let cpFromNoseM: number;
  let cpSource: StabilityBarrowmanData['cpSource'];
  let cnAlphaTotal = 0;

  const liftParts = contributions.filter((c) => c.cnAlpha > 0);
  cnAlphaTotal = liftParts.reduce((s, c) => s + c.cnAlpha, 0);

  if (liftParts.length > 0 && cnAlphaTotal > 0) {
    cpFromNoseM =
      liftParts.reduce((s, c) => s + c.cnAlpha * c.cpStationM, 0) /
      cnAlphaTotal;
    cpSource = 'barrowman-weighted';
    notes.push(
      `CP from Barrowman C_Nα-weighted parts (${liftParts.length} lifting contribution(s), ΣC_Nα=${cnAlphaTotal.toFixed(3)}).`
    );
  } else if (lengthM != null) {
    cpFromNoseM = 0.65 * lengthM;
    cpSource = 'heuristic-0.65L';
    notes.push(
      'Insufficient geometry for Barrowman weights; used heuristic CP ≈ 0.65 × overall length.'
    );
  } else {
    cpFromNoseM = 0.2;
    cpSource = 'fallback-midbody';
    notes.push(
      'No geometry; fell back to CP = 0.2 m. Provide component stations / fin geometry or design.lengthM.'
    );
  }

  const staticMarginM = cpFromNoseM - cgFromNoseM;
  const stabilityCalibers =
    caliberM > 0 ? staticMarginM / caliberM : staticMarginM;

  if (components.length === 0) {
    notes.push(
      'No components on snapshot — margin uses heuristics / synthetic geometry.'
    );
  }

  return {
    cgFromNoseM,
    cpFromNoseM,
    caliberM,
    stabilityCalibers,
    staticMarginM,
    cnAlphaTotal,
    stableSign: staticMarginM > 0,
    lengthM,
    noseShape,
    cgSource,
    cpSource,
    contributions,
    assumptions,
    notes,
  };
}

/**
 * Free module: educational Barrowman-class CP / static margin.
 */
export const stabilityBarrowmanModule: CalcModule<
  StabilityBarrowmanInput | undefined,
  StabilityBarrowmanData
> = {
  id: 'stability.barrowman',
  title: {
    en: 'Stability (Barrowman-class)',
    tr: 'Kararlılık (Barrowman sınıfı)',
  },
  tier: 'free',
  references: [
    'Barrowman, J. S. — The Practical Calculation of the Aerodynamic Characteristics of Slender Finned Vehicles (NASA / Centuri technical notes; public method description)',
    'Barrowman, J. & Barrowman, J. — The Theoretical Prediction of the Center of Pressure (NARAM / model-rocket literature summaries)',
    'OpenRocket technical documentation — stability / Barrowman overview (reference only; no GPL source used)',
    'Mandell, Caporaso, Bengen — Topics in Advanced Model Rocketry (stability margin concept)',
    'NAR practice: static margin in body calibers ≈ (X_CP − X_CG) / D',
  ],

  run(input, ctx): ModuleResult<StabilityBarrowmanData> {
    const data = computeStabilityBarrowman(ctx.design, input);

    const steps: EquationStep[] = [
      {
        title: 'Assumptions (educational approximation)',
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
        title: 'Nose C_Nα and CP',
        latex:
          data.noseShape === 'cone'
            ? '(C_{N\\alpha})_n = 2,\\quad \\bar{X}_n = \\tfrac{2}{3} L_n'
            : '(C_{N\\alpha})_n = 2,\\quad \\bar{X}_n = 0.466\\, L_n\\ (\\text{ogive educational default})',
        prose: `Nose shape = ${data.noseShape}. Slender-body nose contributes C_Nα = 2; CP fraction of nose length follows the selected shape.`,
      },
      {
        title: 'Body tube',
        latex: '(C_{N\\alpha})_{\\text{body}} \\approx 0 \\quad (\\text{cylindrical, classic Barrowman})',
        prose:
          'A cylindrical body tube does not contribute to C_Nα under the classic small-AoA Barrowman assumptions; diameter is still the caliber reference.',
      },
      {
        title: 'Fin-set C_Nα (simplified Barrowman)',
        latex:
          '(C_{N\\alpha})_f = \\left(1+\\frac{R}{S+R}\\right)\\frac{4N(S/d)^2}{1+\\sqrt{1+(2L_f/(C_r+C_t))^2}}',
        prose:
          'Trapezoidal/rectangular fin set with body-on-fin interference. Mid-chord length L_f uses span and LE sweep. Fin CP uses the standard planform formula from the root leading edge.',
      },
      {
        title: 'Overall centre of pressure',
        latex:
          'x_{CP} = \\frac{\\sum_j (C_{N\\alpha})_j \\, x_j}{\\sum_j (C_{N\\alpha})_j}',
        prose:
          data.cpSource === 'barrowman-weighted'
            ? `C_Nα-weighted CP: x_CP = ${data.cpFromNoseM.toFixed(4)} m (ΣC_Nα = ${data.cnAlphaTotal.toFixed(3)}).`
            : `CP heuristic (${data.cpSource}): x_CP = ${data.cpFromNoseM.toFixed(4)} m.`,
      },
      {
        title: 'Static margin in calibers',
        latex:
          '\\mathrm{SM} = \\frac{x_{CP} - x_{CG}}{d}\\quad[\\text{calibers}]',
        prose: `SM = (${data.cpFromNoseM.toFixed(4)} − ${data.cgFromNoseM.toFixed(4)}) / ${data.caliberM.toFixed(4)} = ${data.stabilityCalibers.toFixed(3)} cal (${data.staticMarginM.toFixed(4)} m). ${
          data.stableSign
            ? 'Sign is positive (CP aft of CG) — classically the stable direction. Typical model-rocket targets are often ~1–2+ calibers (context-dependent).'
            : 'Sign is non-positive (CP at or forward of CG) — classically unstable / marginal; increase fin area/span or move mass forward.'
        }`,
      },
    ];

    if (data.contributions.length > 0) {
      steps.push({
        title: 'Part contributions',
        prose: data.contributions
          .map(
            (c) =>
              `${c.name ?? c.id} [${c.kind}]: C_Nα=${c.cnAlpha.toFixed(4)}, x_CP=${c.cpStationM.toFixed(4)} m (${c.method})`
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
      type: 'stability.barrowman.resolved',
      payload: {
        stabilityCalibers: data.stabilityCalibers,
        stableSign: data.stableSign,
        cpFromNoseM: data.cpFromNoseM,
        cgFromNoseM: data.cgFromNoseM,
      },
    });

    return {
      moduleId: this.id,
      data,
      steps,
    };
  },
};
