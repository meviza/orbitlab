import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { RocketDesignSnapshot } from '../types.js';
import {
  atmosphereIsaModule,
  computeAtmosphereIsa,
  ISA_P0_PA,
  ISA_RHO0_KG_M3,
  ISA_T0_K,
  ISA_TROPOPAUSE_M,
  resolveAltitudeM,
  type AtmosphereIsaData,
} from './atmosphere-isa.js';

const baseDesign: RocketDesignSnapshot = {
  massKg: 0.5,
  cd: 0.45,
  areaM2: 0.005,
  thrustN: 20,
  burnTimeS: 1.5,
};

describe('computeAtmosphereIsa', () => {
  it('golden sea level: T≈288.15 K, ρ≈1.225 kg/m³, p≈101325 Pa', () => {
    const data = computeAtmosphereIsa(0);

    assert.equal(data.model, 'ISA-1976-troposphere-approx');
    assert.equal(data.altitudeM, 0);
    assert.ok(
      Math.abs(data.temperatureK - ISA_T0_K) < 1e-9,
      `T sea level ${data.temperatureK}`
    );
    assert.ok(
      Math.abs(data.temperatureK - 288.15) < 1e-9,
      `T≈288.15, got ${data.temperatureK}`
    );
    assert.ok(
      Math.abs(data.pressurePa - ISA_P0_PA) < 1e-6,
      `p sea level ${data.pressurePa}`
    );
    // Golden: ρ ≈ 1.225 (ISA sea-level density)
    assert.ok(
      Math.abs(data.densityKgM3 - ISA_RHO0_KG_M3) < 0.001,
      `ρ sea level ≈ 1.225, got ${data.densityKgM3}`
    );
    assert.ok(
      Math.abs(data.densityKgM3 - 1.225) < 0.001,
      `ρ≈1.225 golden, got ${data.densityKgM3}`
    );
  });

  it('temperature falls with altitude at the lapse rate', () => {
    // At 1000 m: T = 288.15 − 6.5 = 281.65 K
    const data = computeAtmosphereIsa(1000);
    assert.ok(Math.abs(data.temperatureK - 281.65) < 1e-9);
    assert.ok(data.pressurePa < ISA_P0_PA);
    assert.ok(data.densityKgM3 < ISA_RHO0_KG_M3);
  });

  it('clamps above tropopause to 11 km model band', () => {
    const data = computeAtmosphereIsa(15_000);
    assert.equal(data.altitudeM, ISA_TROPOPAUSE_M);
    // T = 288.15 − 0.0065 * 11000 = 216.65 K
    assert.ok(Math.abs(data.temperatureK - 216.65) < 1e-9);
  });

  it('rejects negative altitude', () => {
    assert.throws(() => computeAtmosphereIsa(-1), /altitudeM/);
  });

  it('rejects non-finite altitude', () => {
    assert.throws(() => computeAtmosphereIsa(Number.NaN), /finite/);
  });
});

describe('resolveAltitudeM', () => {
  it('defaults to 0', () => {
    assert.equal(resolveAltitudeM(baseDesign), 0);
  });

  it('reads design.metadata.altitudeM', () => {
    const design = {
      ...baseDesign,
      metadata: { altitudeM: 500 },
    } as RocketDesignSnapshot & { metadata: { altitudeM: number } };
    assert.equal(resolveAltitudeM(design), 500);
  });

  it('prefers input override over metadata', () => {
    const design = {
      ...baseDesign,
      metadata: { altitudeM: 500 },
    } as RocketDesignSnapshot & { metadata: { altitudeM: number } };
    assert.equal(resolveAltitudeM(design, { altitudeM: 200 }), 200);
  });
});

describe('atmosphereIsaModule', () => {
  it('returns steps + sea-level golden when no altitude set', () => {
    const result = atmosphereIsaModule.run(undefined, {
      design: baseDesign,
      config: { dt: 0.01, tMax: 1 },
      previous: new Map(),
    });

    assert.equal(result.moduleId, 'aero.atmosphere-isa');
    assert.equal(atmosphereIsaModule.tier, 'free');
    assert.ok(atmosphereIsaModule.references.length >= 2);
    assert.ok(result.steps.length >= 3);
    assert.ok(
      result.steps.some(
        (s) =>
          s.latex?.includes('T_0') ||
          s.latex?.includes('T =') ||
          s.latex?.includes('p_0')
      )
    );

    const data = result.data as AtmosphereIsaData;
    assert.equal(data.model, 'ISA-1976-troposphere-approx');
    assert.ok(Math.abs(data.temperatureK - 288.15) < 1e-9);
    assert.ok(Math.abs(data.densityKgM3 - 1.225) < 0.001);
    assert.equal(data.altitudeM, 0);
  });

  it('uses design.metadata.altitudeM', () => {
    const design = {
      ...baseDesign,
      metadata: { altitudeM: 1000 },
    } as RocketDesignSnapshot & { metadata: { altitudeM: number } };

    const result = atmosphereIsaModule.run(undefined, {
      design,
      config: { dt: 0.01, tMax: 1 },
      previous: new Map(),
    });

    const data = result.data as AtmosphereIsaData;
    assert.equal(data.altitudeM, 1000);
    assert.ok(Math.abs(data.temperatureK - 281.65) < 1e-9);
  });

  it('accepts altitude input override', () => {
    const result = atmosphereIsaModule.run(
      { altitudeM: 2000 },
      {
        design: baseDesign,
        config: { dt: 0.01, tMax: 1 },
        previous: new Map(),
      }
    );
    const data = result.data as AtmosphereIsaData;
    assert.equal(data.altitudeM, 2000);
    // T = 288.15 − 13 = 275.15
    assert.ok(Math.abs(data.temperatureK - 275.15) < 1e-9);
  });
});
