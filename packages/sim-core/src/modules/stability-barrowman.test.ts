import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { RocketDesignSnapshot } from '../types.js';
import {
  bodyBarrowmanContribution,
  computeStabilityBarrowman,
  estimateCgFromComponents,
  finBarrowmanContribution,
  noseBarrowmanContribution,
  stabilityBarrowmanModule,
  type StabilityBarrowmanData,
} from './stability-barrowman.js';

/**
 * Classic-ish 3FNC educational rocket (stations from nose tip).
 *
 * Expected order-of-magnitude (educational Barrowman, ogive nose default):
 * - Nose X̄ ≈ 0.466 × 0.08 ≈ 0.037 m, C_Nα = 2
 * - Body C_Nα ≈ 0
 * - 3 trapezoidal fins dominate C_Nα; CP lands aft of mid-body
 * - Mass-weighted CG near ~0.28–0.30 m
 * - Static margin typically a few calibers (roughly 1–10 cal band for this layout)
 */
const detailedDesign: RocketDesignSnapshot = {
  massKg: 0.5,
  cd: 0.45,
  areaM2: Math.PI * 0.0125 ** 2,
  thrustN: 20,
  burnTimeS: 1.5,
  lengthM: 0.5,
  diameterM: 0.025,
  components: [
    {
      id: 'nose',
      name: 'Nose cone',
      kind: 'nose',
      massKg: 0.08,
      stationM: 0,
      lengthM: 0.08,
      diameterM: 0.025,
    },
    {
      id: 'body',
      name: 'Body tube',
      kind: 'body',
      massKg: 0.25,
      stationM: 0.08,
      lengthM: 0.35,
      diameterM: 0.025,
    },
    {
      id: 'fins',
      name: 'Fin set',
      kind: 'fin',
      massKg: 0.07,
      stationM: 0.4,
      lengthM: 0.06,
      rootChordM: 0.06,
      tipChordM: 0.03,
      spanM: 0.04,
      sweepM: 0,
      finCount: 3,
    },
    {
      id: 'motor',
      name: 'Motor',
      kind: 'motor',
      massKg: 0.1,
      stationM: 0.42,
      lengthM: 0.07,
    },
  ],
};

/** Hand-derived fin C_Nα / CP for the golden fin geometry (d = 0.025 m). */
function expectedFinMetrics() {
  const d = 0.025;
  const R = d / 2;
  const S = 0.04;
  const Cr = 0.06;
  const Ct = 0.03;
  const N = 3;
  const Xt = 0;
  const midChordSweep = Xt + (Ct - Cr) / 2;
  const Lf = Math.sqrt(S * S + midChordSweep * midChordSweep);
  const interference = 1 + R / (S + R);
  const sumChord = Cr + Ct;
  const aspectTerm = (2 * Lf) / sumChord;
  const denom = 1 + Math.sqrt(1 + aspectTerm * aspectTerm);
  const cnAlpha = (interference * (4 * N * (S / d) * (S / d))) / denom;
  const cpFromRootLe =
    (Xt * (Cr + 2 * Ct)) / (3 * sumChord) +
    (1 / 6) * (Cr + Ct - (Cr * Ct) / sumChord);
  return { cnAlpha, cpFromRootLe, Lf, interference };
}

describe('noseBarrowmanContribution', () => {
  it('places ogive nose CP at 0.466 L from tip', () => {
    const part = noseBarrowmanContribution(
      {
        id: 'n',
        massKg: 0.1,
        kind: 'nose',
        stationM: 0,
        lengthM: 0.1,
        diameterM: 0.025,
      },
      'ogive'
    );
    assert.ok(part);
    assert.ok(Math.abs(part!.cpStationM - 0.0466) < 1e-9);
    assert.equal(part!.cnAlpha, 2);
  });

  it('places conical nose CP at (2/3) L from tip', () => {
    const part = noseBarrowmanContribution(
      {
        id: 'n',
        massKg: 0.1,
        kind: 'nose',
        stationM: 0,
        lengthM: 0.12,
        diameterM: 0.025,
      },
      'cone'
    );
    assert.ok(part);
    assert.ok(Math.abs(part!.cpStationM - 0.08) < 1e-12);
    assert.equal(part!.cnAlpha, 2);
  });
});

describe('bodyBarrowmanContribution', () => {
  it('assigns zero C_Nα for cylindrical body', () => {
    const part = bodyBarrowmanContribution({
      id: 'b',
      massKg: 0.2,
      kind: 'body',
      stationM: 0.1,
      lengthM: 0.3,
      diameterM: 0.025,
    });
    assert.ok(part);
    assert.equal(part!.cnAlpha, 0);
    assert.ok(Math.abs(part!.cpStationM - 0.25) < 1e-12);
  });
});

describe('finBarrowmanContribution', () => {
  it('matches hand-derived trapezoidal fin set metrics', () => {
    const part = finBarrowmanContribution(
      {
        id: 'f',
        massKg: 0.05,
        kind: 'fin',
        stationM: 0.4,
        rootChordM: 0.06,
        tipChordM: 0.03,
        spanM: 0.04,
        sweepM: 0,
        finCount: 3,
      },
      0.025
    );
    assert.ok(part);
    const exp = expectedFinMetrics();
    assert.ok(
      Math.abs(part!.cnAlpha - exp.cnAlpha) < 1e-9,
      `cnAlpha ${part!.cnAlpha} vs ${exp.cnAlpha}`
    );
    assert.ok(
      Math.abs(part!.cpStationM - (0.4 + exp.cpFromRootLe)) < 1e-9
    );
    assert.ok(part!.cnAlpha > 5, 'fins should dominate nose C_Nα=2');
  });
});

describe('estimateCgFromComponents', () => {
  it('mass-weights stations', () => {
    const cg = estimateCgFromComponents([
      { id: 'a', massKg: 1, stationM: 0, lengthM: 0 },
      { id: 'b', massKg: 1, stationM: 1, lengthM: 0 },
    ]);
    assert.ok(cg);
    assert.ok(Math.abs(cg!.cgFromNoseM - 0.5) < 1e-9);
  });
});

describe('computeStabilityBarrowman', () => {
  it('golden 3FNC: positive multi-caliber margin (order-of-magnitude)', () => {
    const data = computeStabilityBarrowman(detailedDesign);

    assert.equal(data.cpSource, 'barrowman-weighted');
    assert.equal(data.cgSource, 'components-mass-weighted');
    assert.equal(data.noseShape, 'ogive');
    assert.equal(data.caliberM, 0.025);
    assert.ok(data.contributions.some((c) => c.kind === 'nose'));
    assert.ok(data.contributions.some((c) => c.kind === 'fin' && c.cnAlpha > 0));
    assert.ok(
      data.contributions.some((c) => c.kind === 'body' && c.cnAlpha === 0)
    );

    // Hand composition of expected CP
    const noseCp = 0.466 * 0.08;
    const fin = expectedFinMetrics();
    const finCp = 0.4 + fin.cpFromRootLe;
    const cnTot = 2 + fin.cnAlpha;
    const expectedCp = (2 * noseCp + fin.cnAlpha * finCp) / cnTot;

    assert.ok(
      Math.abs(data.cpFromNoseM - expectedCp) < 1e-9,
      `cp ${data.cpFromNoseM} vs ${expectedCp}`
    );
    assert.ok(Math.abs(data.cnAlphaTotal - cnTot) < 1e-9);

    // CG: 0.08@0.04 + 0.25@0.255 + 0.07@0.43 + 0.1@0.455
    const expectedCg =
      (0.08 * 0.04 + 0.25 * 0.255 + 0.07 * 0.43 + 0.1 * 0.455) / 0.5;
    assert.ok(Math.abs(data.cgFromNoseM - expectedCg) < 1e-9);

    assert.ok(data.cpFromNoseM > data.cgFromNoseM, 'CP should be aft of CG');
    assert.equal(data.stableSign, true);

    // Order-of-magnitude band: a few calibers for this educational layout
    assert.ok(
      data.stabilityCalibers > 1 && data.stabilityCalibers < 12,
      `expected multi-caliber margin ~1–12, got ${data.stabilityCalibers}`
    );
    assert.ok(
      Math.abs(
        data.stabilityCalibers -
          (data.cpFromNoseM - data.cgFromNoseM) / data.caliberM
      ) < 1e-12
    );
    assert.ok(data.assumptions.some((a) => /Barrowman/i.test(a)));
    assert.ok(data.assumptions.some((a) => /educational/i.test(a)));
  });

  it('cone noseShape shifts nose CP aft vs ogive', () => {
    const ogive = computeStabilityBarrowman(detailedDesign, {
      noseShape: 'ogive',
    });
    const cone = computeStabilityBarrowman(detailedDesign, {
      noseShape: 'cone',
    });
    // Cone nose CP fraction larger (2/3 > 0.466) → overall CP slightly farther aft
    assert.ok(cone.cpFromNoseM > ogive.cpFromNoseM);
  });

  it('respects design.cgFromNoseM and input overrides', () => {
    const fromDesign = computeStabilityBarrowman({
      ...detailedDesign,
      cgFromNoseM: 0.2,
    });
    assert.equal(fromDesign.cgSource, 'design.cgFromNoseM');
    assert.equal(fromDesign.cgFromNoseM, 0.2);

    const fromInput = computeStabilityBarrowman(detailedDesign, {
      cgFromNoseM: 0.1,
      diameterM: 0.03,
    });
    assert.equal(fromInput.cgSource, 'input-override');
    assert.equal(fromInput.cgFromNoseM, 0.1);
    assert.equal(fromInput.caliberM, 0.03);
  });

  it('uses length heuristics when no components', () => {
    const data = computeStabilityBarrowman({
      massKg: 0.4,
      cd: 0.5,
      areaM2: 0.01,
      thrustN: 10,
      burnTimeS: 1,
      lengthM: 1,
      diameterM: 0.04,
    });
    // Synthetic nose+fins should still produce barrowman-weighted CP when length known
    assert.ok(
      data.cpSource === 'barrowman-weighted' || data.cpSource === 'heuristic-0.65L'
    );
    assert.equal(data.cgSource, 'heuristic-0.4L');
    assert.ok(Math.abs(data.cgFromNoseM - 0.4) < 1e-9);
    assert.equal(data.caliberM, 0.04);
    assert.ok(Number.isFinite(data.stabilityCalibers));
  });

  it('reads fin geometry aliases from metadata when present', () => {
    const data = computeStabilityBarrowman({
      massKg: 0.4,
      cd: 0.5,
      areaM2: 0.005,
      thrustN: 10,
      burnTimeS: 1,
      diameterM: 0.025,
      components: [
        {
          id: 'nc',
          name: 'Nose cone',
          massKg: 0.1,
          stationM: 0,
          lengthM: 0.1,
          diameterM: 0.025,
        },
        {
          id: 'f',
          name: 'Fin can',
          massKg: 0.1,
          stationM: 0.4,
          finCount: 4,
          metadata: {
            finRootChordM: 0.05,
            finTipChordM: 0.03,
            finSpanM: 0.04,
            finSweepM: 0.01,
          },
        },
      ],
    });
    assert.equal(data.cpSource, 'barrowman-weighted');
    assert.ok(data.contributions.some((c) => c.kind === 'fin' && c.cnAlpha > 0));
    assert.ok(data.contributions.some((c) => c.kind === 'nose'));
  });
});

describe('stabilityBarrowmanModule', () => {
  it('returns module id, steps, references, and golden stableSign', () => {
    const result = stabilityBarrowmanModule.run(undefined, {
      design: detailedDesign,
      config: { dt: 0.01, tMax: 1 },
      previous: new Map(),
    });

    assert.equal(result.moduleId, 'stability.barrowman');
    assert.ok(stabilityBarrowmanModule.references.length >= 3);
    assert.ok(
      stabilityBarrowmanModule.references.some((r) => /Barrowman/i.test(r))
    );
    assert.ok(
      stabilityBarrowmanModule.references.some((r) => /OpenRocket/i.test(r))
    );
    assert.ok(result.steps.length >= 5);
    assert.ok(
      result.steps.some(
        (s) => s.latex?.includes('C_{N') || s.latex?.includes('x_{CP}')
      )
    );

    const data = result.data as StabilityBarrowmanData;
    assert.equal(data.stableSign, true);
    assert.ok(data.stabilityCalibers > 0);
    assert.ok(data.caliberM > 0);
    assert.ok(Number.isFinite(data.cgFromNoseM));
    assert.ok(Number.isFinite(data.cpFromNoseM));
  });
});
