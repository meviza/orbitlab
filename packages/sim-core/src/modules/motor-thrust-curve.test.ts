import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { RocketDesignSnapshot } from '../types.js';
import {
  burnSpanS,
  computeMotorThrustCurve,
  interpolateThrust,
  motorThrustCurveModule,
  normalizeThrustSamples,
  parseThrustCurve,
  peakThrust,
  rectangleThrustCurve,
  trapezoidalImpulse,
  type MotorThrustCurveData,
  type ThrustSample,
} from './motor-thrust-curve.js';

const baseDesign: RocketDesignSnapshot = {
  massKg: 0.5,
  cd: 0.45,
  areaM2: 0.005,
  thrustN: 20,
  burnTimeS: 1.5,
};

type DesignWithMeta = RocketDesignSnapshot & {
  metadata?: Record<string, unknown>;
};

describe('trapezoidalImpulse / pure helpers', () => {
  it('matches analytic trapz golden values on a trapezoid table', () => {
    // Triangle-ish table: 0→10→10→0 over 3 s
    // I = ½(0+10)·1 + ½(10+10)·1 + ½(10+0)·1 = 5 + 10 + 5 = 20
    const samples: ThrustSample[] = [
      { t: 0, n: 0 },
      { t: 1, n: 10 },
      { t: 2, n: 10 },
      { t: 3, n: 0 },
    ];
    assert.ok(Math.abs(trapezoidalImpulse(samples) - 20) < 1e-12);
    assert.equal(peakThrust(samples), 10);
    assert.equal(burnSpanS(samples), 3);
  });

  it('rectangle recovers I = T · t_b exactly', () => {
    const samples = rectangleThrustCurve(20, 1.5);
    assert.equal(samples.length, 2);
    assert.ok(Math.abs(trapezoidalImpulse(samples) - 30) < 1e-12);
    assert.equal(peakThrust(samples), 20);
    assert.equal(burnSpanS(samples), 1.5);
  });

  it('zero burn span yields zero impulse', () => {
    const samples = rectangleThrustCurve(15, 0);
    assert.equal(trapezoidalImpulse(samples), 0);
    assert.equal(burnSpanS(samples), 0);
  });

  it('normalizeThrustSamples sorts by time', () => {
    const s = normalizeThrustSamples([
      { t: 2, n: 5 },
      { t: 0, n: 1 },
      { t: 1, n: 3 },
    ]);
    assert.deepEqual(
      s.map((p) => p.t),
      [0, 1, 2]
    );
  });

  it('rejects negative thrust', () => {
    assert.throws(() => normalizeThrustSamples([{ t: 0, n: -1 }]), /≥ 0/);
  });

  it('parseThrustCurve accepts valid arrays and rejects junk', () => {
    const ok = parseThrustCurve([
      { t: 0, n: 1 },
      { t: 1, n: 2 },
    ]);
    assert.ok(ok != null && ok.length === 2);
    assert.equal(parseThrustCurve(null), null);
    assert.equal(parseThrustCurve([{ t: 0 }]), null);
    assert.equal(parseThrustCurve('nope'), null);
  });

  it('interpolateThrust is linear between knots and clamps outside', () => {
    const samples: ThrustSample[] = [
      { t: 0, n: 0 },
      { t: 1, n: 10 },
      { t: 2, n: 10 },
    ];
    assert.ok(Math.abs(interpolateThrust(samples, 0.5) - 5) < 1e-12);
    assert.ok(Math.abs(interpolateThrust(samples, 1.5) - 10) < 1e-12);
    assert.equal(interpolateThrust(samples, -1), 0);
    assert.equal(interpolateThrust(samples, 99), 10);
  });
});

describe('computeMotorThrustCurve', () => {
  it('rectangle golden: thrustN=20, burnTimeS=1.5 → I=30, avg=20, peak=20', () => {
    const data = computeMotorThrustCurve({ thrustN: 20, burnTimeS: 1.5 });
    assert.equal(data.source, 'rectangle');
    assert.ok(Math.abs(data.impulseNs - 30) < 1e-12);
    assert.ok(Math.abs(data.averageThrustN - 20) < 1e-12);
    assert.equal(data.peakThrustN, 20);
    assert.equal(data.burnTimeS, 1.5);
    assert.equal(data.samples.length, 2);
  });

  it('table golden: impulse 20 N·s, peak 10 N, burn 3 s, avg ≈ 6.666…', () => {
    const data = computeMotorThrustCurve({
      samples: [
        { t: 0, n: 0 },
        { t: 1, n: 10 },
        { t: 2, n: 10 },
        { t: 3, n: 0 },
      ],
    });
    assert.equal(data.source, 'input.samples');
    assert.ok(Math.abs(data.impulseNs - 20) < 1e-12);
    assert.equal(data.peakThrustN, 10);
    assert.equal(data.burnTimeS, 3);
    assert.ok(Math.abs(data.averageThrustN - 20 / 3) < 1e-12);
  });
});

describe('motorThrustCurveModule', () => {
  it('uses rectangle from design.thrustN + burnTimeS when no curve', () => {
    const result = motorThrustCurveModule.run(undefined, {
      design: baseDesign,
      config: { dt: 0.01, tMax: 1 },
      previous: new Map(),
    });

    assert.equal(result.moduleId, 'motor.thrust-curve');
    assert.equal(motorThrustCurveModule.tier, 'free');
    assert.ok(motorThrustCurveModule.references.length >= 2);
    assert.ok(result.steps.length >= 3);
    assert.ok(
      result.steps.some(
        (s) => s.latex?.includes('\\int') || s.latex?.includes('int')
      )
    );

    const data = result.data as MotorThrustCurveData;
    assert.equal(data.source, 'rectangle');
    assert.ok(Math.abs(data.impulseNs - 30) < 1e-9);
    assert.ok(Math.abs(data.averageThrustN - 20) < 1e-9);
    assert.equal(data.peakThrustN, 20);
    assert.equal(data.burnTimeS, 1.5);
    assert.ok(result.series?.t?.length === 2);
    assert.ok(result.series?.thrustN?.length === 2);
  });

  it('parses design.metadata.thrustCurve samples', () => {
    const design: DesignWithMeta = {
      ...baseDesign,
      metadata: {
        thrustCurve: [
          { t: 0, n: 0 },
          { t: 0.5, n: 40 },
          { t: 1.0, n: 40 },
          { t: 1.2, n: 0 },
        ],
      },
    };

    const result = motorThrustCurveModule.run(undefined, {
      design: design as RocketDesignSnapshot,
      config: { dt: 0.01, tMax: 1 },
      previous: new Map(),
    });

    const data = result.data as MotorThrustCurveData;
    assert.equal(data.source, 'metadata.thrustCurve');
    // I = ½(0+40)·0.5 + ½(40+40)·0.5 + ½(40+0)·0.2 = 10 + 20 + 4 = 34
    assert.ok(Math.abs(data.impulseNs - 34) < 1e-9);
    assert.equal(data.peakThrustN, 40);
    assert.ok(Math.abs(data.burnTimeS - 1.2) < 1e-12);
    assert.ok(Math.abs(data.averageThrustN - 34 / 1.2) < 1e-9);
    assert.equal(data.samples.length, 4);
  });

  it('input.samples override metadata and rectangle', () => {
    const design: DesignWithMeta = {
      ...baseDesign,
      metadata: {
        thrustCurve: [
          { t: 0, n: 100 },
          { t: 1, n: 100 },
        ],
      },
    };

    const result = motorThrustCurveModule.run(
      {
        samples: [
          { t: 0, n: 10 },
          { t: 2, n: 10 },
        ],
      },
      {
        design: design as RocketDesignSnapshot,
        config: { dt: 0.01, tMax: 1 },
        previous: new Map(),
      }
    );

    const data = result.data as MotorThrustCurveData;
    assert.equal(data.source, 'input.samples');
    assert.ok(Math.abs(data.impulseNs - 20) < 1e-12);
    assert.equal(data.peakThrustN, 10);
  });

  it('accepts rectangle overrides via input thrustN / burnTimeS', () => {
    const result = motorThrustCurveModule.run(
      { thrustN: 10, burnTimeS: 2 },
      {
        design: baseDesign,
        config: { dt: 0.01, tMax: 1 },
        previous: new Map(),
      }
    );
    const data = result.data as MotorThrustCurveData;
    assert.equal(data.source, 'rectangle');
    assert.ok(Math.abs(data.impulseNs - 20) < 1e-12);
    assert.ok(Math.abs(data.averageThrustN - 10) < 1e-12);
  });

  it('emits motor.thrust-curve.resolved', () => {
    const events: Array<{ type: string; payload?: unknown }> = [];
    motorThrustCurveModule.run(undefined, {
      design: baseDesign,
      config: { dt: 0.01, tMax: 1 },
      previous: new Map(),
      emit: (e) => events.push(e),
    });
    assert.ok(events.some((e) => e.type === 'motor.thrust-curve.resolved'));
  });
});
