import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { RocketDesignSnapshot } from '../types.js';
import {
  computeStabilityMarginLite,
  estimateCgFromComponents,
  estimateComponentCp,
  stabilityMarginLiteModule,
  type StabilityMarginLiteData,
} from './stability-margin-lite.js';

/** Classic-ish 3FNC educational rocket with stations from nose tip. */
const detailedDesign: RocketDesignSnapshot = {
  massKg: 0.5,
  cd: 0.45,
  areaM2: Math.PI * 0.0125 ** 2, // ~25 mm body
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

describe('estimateComponentCp', () => {
  it('places conical nose CP near 0.466 L', () => {
    const cp = estimateComponentCp({
      id: 'n',
      massKg: 0.1,
      kind: 'nose',
      stationM: 0,
      lengthM: 0.1,
      diameterM: 0.025,
    });
    assert.ok(cp);
    assert.ok(Math.abs(cp!.cpStationM - 0.0466) < 1e-9);
    assert.equal(cp!.kind, 'nose');
  });

  it('returns null without station', () => {
    assert.equal(
      estimateComponentCp({ id: 'x', massKg: 1, kind: 'body', lengthM: 0.2 }),
      null
    );
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

describe('computeStabilityMarginLite', () => {
  it('produces positive margin for aft fins (golden shape)', () => {
    const data = computeStabilityMarginLite(detailedDesign);

    assert.equal(data.cpSource, 'component-weighted');
    assert.equal(data.cgSource, 'components-mass-weighted');
    assert.ok(data.contributions.length >= 3);
    assert.ok(data.cpFromNoseM > data.cgFromNoseM, 'CP should be aft of CG');
    assert.ok(data.staticMarginCalibers > 0);
    assert.equal(data.stableSign, true);
    assert.ok(data.assumptions.some((a) => /Barrowman/i.test(a)));
    assert.ok(data.diameterM > 0);

    // Rough educational band for this layout (not a certified value)
    assert.ok(
      data.staticMarginCalibers > 0.5 && data.staticMarginCalibers < 15,
      `expected plausible caliber margin, got ${data.staticMarginCalibers}`
    );
  });

  it('respects design.cgFromNoseM override path', () => {
    const data = computeStabilityMarginLite({
      ...detailedDesign,
      cgFromNoseM: 0.2,
    });
    assert.equal(data.cgSource, 'design.cgFromNoseM');
    assert.equal(data.cgFromNoseM, 0.2);
  });

  it('uses length heuristics when no components', () => {
    const data = computeStabilityMarginLite({
      massKg: 0.4,
      cd: 0.5,
      areaM2: 0.01,
      thrustN: 10,
      burnTimeS: 1,
      lengthM: 1,
      diameterM: 0.04,
    });
    assert.equal(data.cpSource, 'heuristic-0.65L');
    assert.equal(data.cgSource, 'heuristic-0.4L');
    assert.ok(Math.abs(data.cpFromNoseM - 0.65) < 1e-9);
    assert.ok(Math.abs(data.cgFromNoseM - 0.4) < 1e-9);
    // SM = (0.65-0.4)/0.04 = 6.25 cal
    assert.ok(Math.abs(data.staticMarginCalibers - 6.25) < 1e-9);
  });

  it('infers kind from component names when kind omitted', () => {
    const data = computeStabilityMarginLite({
      massKg: 0.5,
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
          rootChordM: 0.05,
          tipChordM: 0.03,
          spanM: 0.04,
          finCount: 4,
        },
      ],
    });
    assert.ok(data.contributions.some((c) => c.kind === 'nose'));
    assert.ok(data.contributions.some((c) => c.kind === 'fin'));
  });
});

describe('stabilityMarginLiteModule', () => {
  it('returns steps + references with stableSign golden', () => {
    const result = stabilityMarginLiteModule.run(undefined, {
      design: detailedDesign,
      config: { dt: 0.01, tMax: 1 },
      previous: new Map(),
    });

    assert.equal(result.moduleId, 'stability.margin-lite');
    assert.ok(stabilityMarginLiteModule.references.length >= 2);
    assert.ok(result.steps.length >= 3);
    assert.ok(result.steps.some((s) => s.latex?.includes('SM') || s.latex?.includes('x_{CP}')));

    const data = result.data as StabilityMarginLiteData;
    assert.equal(data.stableSign, true);
    assert.ok(data.staticMarginCalibers > 0);
  });

  it('accepts CG input override', () => {
    const result = stabilityMarginLiteModule.run(
      { cgFromNoseM: 0.1, diameterM: 0.025 },
      {
        design: detailedDesign,
        config: { dt: 0.01, tMax: 1 },
        previous: new Map(),
      }
    );
    const data = result.data as StabilityMarginLiteData;
    assert.equal(data.cgSource, 'input-override');
    assert.equal(data.cgFromNoseM, 0.1);
    assert.equal(data.diameterM, 0.025);
  });
});
