import type { CalcModule, EquationStep, ModuleResult } from '../module.js';
import type { RocketDesignSnapshot } from '../types.js';

export interface MassPropertiesInput {
  /** Override design mass if provided */
  massKg?: number;
}

export interface MassPropertiesData {
  totalMassKg: number;
  componentCount: number;
  components: Array<{ id: string; massKg: number; name?: string }>;
  source: 'design.massKg' | 'components-sum' | 'input-override';
}

/**
 * Free stub: resolves total mass from design snapshot (and optional components).
 * Emits equation steps for the report engine.
 */
export const massPropertiesModule: CalcModule<
  MassPropertiesInput | undefined,
  MassPropertiesData
> = {
  id: 'mass.properties',
  title: {
    en: 'Mass properties',
    tr: 'Kütle özellikleri',
  },
  tier: 'free',
  references: [
    'NASA SP-8024 — Solid Rocket Motor Performance Analysis',
    'Standard model-rocket mass budget practice (SI)',
  ],

  run(input, ctx): ModuleResult<MassPropertiesData> {
    const design: RocketDesignSnapshot = ctx.design;
    const components = design.components ?? [];
    const componentSum = components.reduce((s, c) => s + c.massKg, 0);

    let totalMassKg: number;
    let source: MassPropertiesData['source'];

    if (input?.massKg !== undefined && Number.isFinite(input.massKg)) {
      totalMassKg = input.massKg;
      source = 'input-override';
    } else if (components.length > 0) {
      // Prefer explicit component breakdown when present
      totalMassKg = componentSum > 0 ? componentSum : design.massKg;
      source = componentSum > 0 ? 'components-sum' : 'design.massKg';
    } else {
      totalMassKg = design.massKg;
      source = 'design.massKg';
    }

    if (!(totalMassKg > 0)) {
      throw new Error('mass.properties: total mass must be > 0 kg');
    }

    const steps: EquationStep[] = [
      {
        title: 'Total mass',
        latex: 'm = \\sum_i m_i',
        prose:
          source === 'components-sum'
            ? `Total mass is the sum of ${components.length} component mass(es): m = ${totalMassKg.toFixed(4)} kg.`
            : source === 'input-override'
              ? `Total mass taken from module input override: m = ${totalMassKg.toFixed(4)} kg.`
              : `Total mass taken from design snapshot: m = ${totalMassKg.toFixed(4)} kg.`,
      },
      {
        title: 'Assumption',
        prose:
          'Mass is treated as constant during the burn for free-tier modules (no propellant depletion model yet).',
      },
    ];

    if (components.length > 0) {
      steps.push({
        title: 'Component breakdown',
        prose: components
          .map((c) => `${c.name ?? c.id}: ${c.massKg.toFixed(4)} kg`)
          .join('; '),
      });
    }

    ctx.emit?.({
      type: 'mass.resolved',
      payload: { totalMassKg, source },
    });

    return {
      moduleId: this.id,
      data: {
        totalMassKg,
        componentCount: components.length,
        components: components.map((c) => ({ ...c })),
        source,
      },
      steps,
    };
  },
};
