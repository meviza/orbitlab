import type { CalcModule, EquationStep, ModuleResult } from '../module.js';
import {
  SEA_LEVEL_RHO_KG_M3,
  STANDARD_G,
  type RocketDesignSnapshot,
} from '../types.js';

/** Default parachute drag coefficient (dimensionless). */
export const DEFAULT_PARACHUTE_CD = 1.5;

/** Default parachute reference area (m²). */
export const DEFAULT_PARACHUTE_AREA_M2 = 0.3;

/**
 * Fallback deploy altitude (m) when neither flight apogee nor design metadata
 * provides a value.
 */
export const DEFAULT_DEPLOY_ALTITUDE_M = 100;

/** Optional recovery-related fields carried on the design snapshot. */
export interface RecoveryDesignFields {
  parachuteCd?: number;
  parachuteAreaM2?: number;
  deployAltitudeM?: number;
  metadata?: Record<string, unknown>;
  rhoKgM3?: number;
}

export interface RecoveryDeployInput {
  /** Override parachute Cd */
  parachuteCd?: number;
  /** Override parachute area (m²) */
  parachuteAreaM2?: number;
  /** Override deploy altitude (m AGL) */
  deployAltitudeM?: number;
  /** Override air density (kg/m³) */
  rhoKgM3?: number;
  /** Override mass (kg) */
  massKg?: number;
}

export interface RecoveryDeployData {
  parachuteCd: number;
  parachuteAreaM2: number;
  /** Deploy altitude used for descent estimate (m AGL) */
  deployAltitudeM: number;
  /** Terminal velocity under parachute: √(2mg / (ρ Cd A)) (m/s) */
  terminalVelocityMs: number;
  /** Approximate descent time h / v_term (s) */
  descentTimeS: number;
  massKg: number;
  rhoKgM3: number;
  g: number;
  /** How deploy altitude was chosen */
  deployAltitudeSource:
    | 'input-override'
    | 'flight.toy-vertical.maxAltitudeM'
    | 'design.deployAltitudeM'
    | 'design.metadata.deployAltitudeM'
    | 'default';
}

function numFromUnknown(v: unknown): number | undefined {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

function designRecoveryFields(
  design: RocketDesignSnapshot
): RocketDesignSnapshot & RecoveryDesignFields {
  return design as RocketDesignSnapshot & RecoveryDesignFields;
}

function metaNumber(
  metadata: Record<string, unknown> | undefined,
  key: string
): number | undefined {
  if (!metadata) return undefined;
  return numFromUnknown(metadata[key]);
}

/**
 * Terminal velocity under an open parachute (quadratic drag = weight):
 * v = √(2 m g / (ρ C_D A))
 */
export function parachuteTerminalVelocityMs(opts: {
  massKg: number;
  parachuteCd: number;
  parachuteAreaM2: number;
  rhoKgM3?: number;
  g?: number;
}): number {
  const rhoKgM3 = opts.rhoKgM3 ?? SEA_LEVEL_RHO_KG_M3;
  const g = opts.g ?? STANDARD_G;
  const { massKg, parachuteCd, parachuteAreaM2 } = opts;

  if (!(massKg > 0) || !Number.isFinite(massKg)) {
    throw new Error('recovery.deploy-simple: massKg must be finite and > 0');
  }
  if (!(parachuteCd > 0) || !Number.isFinite(parachuteCd)) {
    throw new Error(
      'recovery.deploy-simple: parachuteCd must be finite and > 0'
    );
  }
  if (!(parachuteAreaM2 > 0) || !Number.isFinite(parachuteAreaM2)) {
    throw new Error(
      'recovery.deploy-simple: parachuteAreaM2 must be finite and > 0'
    );
  }
  if (!(rhoKgM3 > 0) || !Number.isFinite(rhoKgM3)) {
    throw new Error('recovery.deploy-simple: rhoKgM3 must be finite and > 0');
  }
  if (!(g > 0) || !Number.isFinite(g)) {
    throw new Error('recovery.deploy-simple: g must be finite and > 0');
  }

  return Math.sqrt(
    (2 * massKg * g) / (rhoKgM3 * parachuteCd * parachuteAreaM2)
  );
}

/**
 * Pure recovery deploy summary: terminal velocity + approximate descent time.
 */
export function computeRecoveryDeploy(opts: {
  massKg: number;
  parachuteCd: number;
  parachuteAreaM2: number;
  deployAltitudeM: number;
  rhoKgM3?: number;
  g?: number;
  deployAltitudeSource?: RecoveryDeployData['deployAltitudeSource'];
}): RecoveryDeployData {
  const rhoKgM3 = opts.rhoKgM3 ?? SEA_LEVEL_RHO_KG_M3;
  const g = opts.g ?? STANDARD_G;
  const { massKg, parachuteCd, parachuteAreaM2, deployAltitudeM } = opts;

  if (!(deployAltitudeM >= 0) || !Number.isFinite(deployAltitudeM)) {
    throw new Error(
      'recovery.deploy-simple: deployAltitudeM must be a finite number ≥ 0'
    );
  }

  const terminalVelocityMs = parachuteTerminalVelocityMs({
    massKg,
    parachuteCd,
    parachuteAreaM2,
    rhoKgM3,
    g,
  });

  // Educational approximation: constant terminal speed from deploy to ground.
  const descentTimeS =
    terminalVelocityMs > 0 ? deployAltitudeM / terminalVelocityMs : 0;

  return {
    parachuteCd,
    parachuteAreaM2,
    deployAltitudeM,
    terminalVelocityMs,
    descentTimeS,
    massKg,
    rhoKgM3,
    g,
    deployAltitudeSource: opts.deployAltitudeSource ?? 'default',
  };
}

/**
 * Free module: simple parachute deploy event — terminal velocity and
 * approximate descent time from deploy altitude.
 * Prefer apogee from previous flight.toy-vertical when available.
 */
export const recoveryDeploySimpleModule: CalcModule<
  RecoveryDeployInput | undefined,
  RecoveryDeployData
> = {
  id: 'recovery.deploy-simple',
  title: {
    en: 'Simple recovery deploy',
    tr: 'Basit paraşüt açılışı',
  },
  tier: 'free',
  references: [
    'Quadratic drag balance at terminal velocity: ½ ρ v² C_D A = m g',
    'v_term = √(2 m g / (ρ C_D A))',
    'Educational descent time ≈ h / v_term (constant terminal speed)',
    'ISA sea-level ρ ≈ 1.225 kg/m³',
  ],

  run(input, ctx): ModuleResult<RecoveryDeployData> {
    const design = designRecoveryFields(ctx.design);
    const massResult = ctx.previous.get('mass.properties');
    const massFromPrev = (
      massResult?.data as { totalMassKg?: number } | undefined
    )?.totalMassKg;

    const flightResult = ctx.previous.get('flight.toy-vertical');
    const maxAltitudeFromFlight = (
      flightResult?.data as { maxAltitudeM?: number } | undefined
    )?.maxAltitudeM;

    const parachuteCd =
      input?.parachuteCd ??
      design.parachuteCd ??
      metaNumber(design.metadata, 'parachuteCd') ??
      DEFAULT_PARACHUTE_CD;

    const parachuteAreaM2 =
      input?.parachuteAreaM2 ??
      design.parachuteAreaM2 ??
      metaNumber(design.metadata, 'parachuteAreaM2') ??
      DEFAULT_PARACHUTE_AREA_M2;

    let deployAltitudeM: number;
    let deployAltitudeSource: RecoveryDeployData['deployAltitudeSource'];

    if (
      input?.deployAltitudeM !== undefined &&
      Number.isFinite(input.deployAltitudeM)
    ) {
      deployAltitudeM = input.deployAltitudeM;
      deployAltitudeSource = 'input-override';
    } else if (
      maxAltitudeFromFlight != null &&
      Number.isFinite(maxAltitudeFromFlight) &&
      maxAltitudeFromFlight > 0
    ) {
      deployAltitudeM = maxAltitudeFromFlight;
      deployAltitudeSource = 'flight.toy-vertical.maxAltitudeM';
    } else if (
      design.deployAltitudeM != null &&
      Number.isFinite(design.deployAltitudeM)
    ) {
      deployAltitudeM = design.deployAltitudeM;
      deployAltitudeSource = 'design.deployAltitudeM';
    } else {
      const fromMeta = metaNumber(design.metadata, 'deployAltitudeM');
      if (fromMeta != null && fromMeta >= 0) {
        deployAltitudeM = fromMeta;
        deployAltitudeSource = 'design.metadata.deployAltitudeM';
      } else {
        deployAltitudeM = DEFAULT_DEPLOY_ALTITUDE_M;
        deployAltitudeSource = 'default';
      }
    }

    const massKg =
      input?.massKg ??
      massFromPrev ??
      (design.massKg > 0 ? design.massKg : undefined);

    if (massKg == null || !(massKg > 0)) {
      throw new Error(
        'recovery.deploy-simple: massKg must be resolved from input, mass.properties, or design'
      );
    }

    const rhoKgM3 =
      input?.rhoKgM3 ?? design.rhoKgM3 ?? SEA_LEVEL_RHO_KG_M3;

    const data = computeRecoveryDeploy({
      massKg,
      parachuteCd,
      parachuteAreaM2,
      deployAltitudeM,
      rhoKgM3,
      deployAltitudeSource,
    });

    const steps: EquationStep[] = [
      {
        title: 'Assumptions',
        prose:
          'Single deploy event, parachute opens instantly and fully at deploy altitude, constant C_D and area, sea-level density unless overridden, no wind, vertical descent at constant terminal speed after deploy. Educational free-tier recovery model — not a multi-event or reefed-chute simulation.',
      },
      {
        title: 'Deploy altitude',
        prose:
          deployAltitudeSource === 'flight.toy-vertical.maxAltitudeM'
            ? `Deploy altitude taken from previous flight.toy-vertical max altitude (apogee-like): h_deploy = ${deployAltitudeM.toFixed(2)} m.`
            : deployAltitudeSource === 'input-override'
              ? `Deploy altitude from module input: h_deploy = ${deployAltitudeM.toFixed(2)} m.`
              : deployAltitudeSource === 'design.deployAltitudeM'
                ? `Deploy altitude from design field: h_deploy = ${deployAltitudeM.toFixed(2)} m.`
                : deployAltitudeSource === 'design.metadata.deployAltitudeM'
                  ? `Deploy altitude from design metadata: h_deploy = ${deployAltitudeM.toFixed(2)} m.`
                  : `Deploy altitude defaulted to ${DEFAULT_DEPLOY_ALTITUDE_M} m (no flight apogee or design metadata).`,
      },
      {
        title: 'Terminal velocity under parachute',
        latex:
          'v_{\\mathrm{term}} = \\sqrt{\\dfrac{2 m g}{\\rho\\, C_D\\, A}}',
        prose: `Balance ½ ρ v² C_D A = m g ⇒ v_term = √(2mg/(ρ C_D A)) = √(2 × ${massKg.toFixed(4)} × ${STANDARD_G} / (${rhoKgM3.toFixed(3)} × ${parachuteCd.toFixed(3)} × ${parachuteAreaM2.toFixed(4)})) = ${data.terminalVelocityMs.toFixed(4)} m/s.`,
      },
      {
        title: 'Approximate descent time',
        latex: 't_{\\mathrm{desc}} \\approx \\frac{h_{\\mathrm{deploy}}}{v_{\\mathrm{term}}}',
        prose: `Assuming constant terminal speed from deploy to ground: t_desc ≈ ${deployAltitudeM.toFixed(2)} / ${data.terminalVelocityMs.toFixed(4)} = ${data.descentTimeS.toFixed(2)} s.`,
      },
      {
        title: 'Inputs',
        prose: `m = ${massKg.toFixed(4)} kg, C_D,chute = ${parachuteCd.toFixed(3)}, A_chute = ${parachuteAreaM2} m², ρ = ${rhoKgM3} kg/m³, g = ${STANDARD_G} m/s², h_deploy = ${deployAltitudeM.toFixed(2)} m (source: ${deployAltitudeSource}).`,
      },
    ];

    ctx.emit?.({
      type: 'recovery.deploy.resolved',
      payload: {
        deployAltitudeM: data.deployAltitudeM,
        terminalVelocityMs: data.terminalVelocityMs,
        descentTimeS: data.descentTimeS,
      },
    });

    return {
      moduleId: this.id,
      data,
      steps,
    };
  },
};
