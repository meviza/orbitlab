import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { RocketDesignSnapshot } from '../types.js';
import {
  computeConstantWind,
  DEFAULT_WIND_AZIMUTH_DEG,
  DEFAULT_WIND_MS,
  windComponentsFromMeteo,
  windConstantModule,
  type WindConstantData,
} from './wind-constant.js';

const baseDesign: RocketDesignSnapshot = {
  massKg: 0.5,
  cd: 0.45,
  areaM2: 0.005,
  thrustN: 20,
  burnTimeS: 1.5,
};

/** West wind: meteorological FROM 270° → blows toward east. */
const WEST_AZIMUTH_DEG = 270;
const WIND_MS = 3;

describe('windComponentsFromMeteo', () => {
  it('resolves 3 m/s west wind to east +3, north 0', () => {
    const { windEastMs, windNorthMs } = windComponentsFromMeteo(
      WIND_MS,
      WEST_AZIMUTH_DEG
    );
    assert.ok(Math.abs(windEastMs - 3) < 1e-12, `east=${windEastMs}`);
    assert.ok(Math.abs(windNorthMs - 0) < 1e-12, `north=${windNorthMs}`);
  });

  it('resolves north wind (0°) to north negative (from north → southbound)', () => {
    const { windEastMs, windNorthMs } = windComponentsFromMeteo(5, 0);
    assert.ok(Math.abs(windEastMs - 0) < 1e-12);
    assert.ok(Math.abs(windNorthMs - -5) < 1e-12);
  });

  it('resolves east wind (90°) to westbound (east −W)', () => {
    const { windEastMs, windNorthMs } = windComponentsFromMeteo(4, 90);
    assert.ok(Math.abs(windEastMs - -4) < 1e-12);
    assert.ok(Math.abs(windNorthMs - 0) < 1e-12);
  });

  it('rejects negative speed', () => {
    assert.throws(() => windComponentsFromMeteo(-1, 270), /windMs/);
  });
});

describe('computeConstantWind', () => {
  it('matches 3 m/s west golden components and drift', () => {
    const data = computeConstantWind({
      windMs: WIND_MS,
      azimuthDeg: WEST_AZIMUTH_DEG,
      flightTimeS: 10,
    });

    assert.ok(Math.abs(data.windEastMs - 3) < 1e-12);
    assert.ok(Math.abs(data.windNorthMs - 0) < 1e-12);
    assert.equal(data.windMs, 3);
    assert.equal(data.azimuthDeg, 270);
    assert.ok(Math.abs((data.driftEstimateM ?? NaN) - 30) < 1e-12);
    assert.equal(data.flightTimeS, 10);
  });

  it('returns null drift without flight time', () => {
    const data = computeConstantWind({
      windMs: 3,
      azimuthDeg: 270,
    });
    assert.equal(data.driftEstimateM, null);
    assert.equal(data.flightTimeS, null);
  });
});

describe('windConstantModule', () => {
  it('defaults to 3 m/s west and emits educational steps', () => {
    const result = windConstantModule.run(undefined, {
      design: baseDesign,
      config: { dt: 0.01, tMax: 1 },
      previous: new Map(),
    });

    assert.equal(result.moduleId, 'aero.wind-constant');
    assert.equal(windConstantModule.tier, 'free');
    assert.ok(windConstantModule.references.length >= 2);
    assert.ok(result.steps.length >= 3);
    assert.ok(
      result.steps.some(
        (s) => s.latex?.includes('sin') || s.latex?.includes('\\sin')
      )
    );

    const data = result.data as WindConstantData;
    assert.equal(data.windMs, DEFAULT_WIND_MS);
    assert.equal(data.azimuthDeg, DEFAULT_WIND_AZIMUTH_DEG);
    assert.ok(Math.abs(data.windEastMs - 3) < 1e-12);
    assert.ok(Math.abs(data.windNorthMs - 0) < 1e-12);
    assert.equal(data.driftEstimateM, null);
  });

  it('uses design metadata windMs / windAzimuthDeg', () => {
    const design = {
      ...baseDesign,
      metadata: { windMs: 5, windAzimuthDeg: 0 },
    } as RocketDesignSnapshot & { metadata: Record<string, unknown> };

    const result = windConstantModule.run(undefined, {
      design,
      config: { dt: 0.01, tMax: 1 },
      previous: new Map(),
    });
    const data = result.data as WindConstantData;
    assert.equal(data.windMs, 5);
    assert.equal(data.azimuthDeg, 0);
    assert.ok(Math.abs(data.windEastMs - 0) < 1e-12);
    assert.ok(Math.abs(data.windNorthMs - -5) < 1e-12);
  });

  it('drift estimate from previous flight.toy-vertical flightTimeS', () => {
    const previous = new Map([
      [
        'flight.toy-vertical',
        {
          moduleId: 'flight.toy-vertical',
          data: { flightTimeS: 12.5 },
          steps: [],
        },
      ],
    ]);

    const result = windConstantModule.run(undefined, {
      design: baseDesign,
      config: { dt: 0.01, tMax: 30 },
      previous,
    });
    const data = result.data as WindConstantData;
    // default 3 m/s × 12.5 s = 37.5 m
    assert.ok(Math.abs((data.driftEstimateM ?? NaN) - 37.5) < 1e-12);
    assert.equal(data.flightTimeS, 12.5);
    assert.ok(
      result.steps.some((s) => s.title.includes('drift') || s.title.includes('Drift'))
    );
  });

  it('accepts input overrides over metadata and previous flight', () => {
    const design = {
      ...baseDesign,
      metadata: { windMs: 9, windAzimuthDeg: 180 },
    } as RocketDesignSnapshot & { metadata: Record<string, unknown> };

    const previous = new Map([
      [
        'flight.toy-vertical',
        {
          moduleId: 'flight.toy-vertical',
          data: { flightTimeS: 100 },
          steps: [],
        },
      ],
    ]);

    const result = windConstantModule.run(
      { windMs: 2, windAzimuthDeg: 90, flightTimeS: 4 },
      {
        design,
        config: { dt: 0.01, tMax: 1 },
        previous,
      }
    );
    const data = result.data as WindConstantData;
    assert.equal(data.windMs, 2);
    assert.equal(data.azimuthDeg, 90);
    assert.ok(Math.abs(data.windEastMs - -2) < 1e-12);
    assert.ok(Math.abs(data.windNorthMs - 0) < 1e-12);
    assert.ok(Math.abs((data.driftEstimateM ?? NaN) - 8) < 1e-12);
  });
});
