import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { RocketDesignSnapshot } from '../types.js';
import { ModuleRegistry } from '../registry.js';
import {
  computeSimpleDrag,
  DEFAULT_VELOCITY_SAMPLE_MS,
  simpleDragModule,
  type SimpleDragData,
} from './simple-drag.js';
import { massPropertiesModule } from './mass-properties.js';

const baseDesign: RocketDesignSnapshot = {
  massKg: 0.5,
  cd: 0.45,
  areaM2: 0.005,
  thrustN: 20,
  burnTimeS: 1.5,
  velocitySampleMs: 50,
  rhoKgM3: 1.225,
};

describe('computeSimpleDrag', () => {
  it('matches analytic quadratic drag golden values', () => {
    // D = ½ ρ v² Cd A
    // ρ=1.225, v=40, Cd=0.5, A=0.01
    // q = 0.5 * 1.225 * 1600 = 980
    // D = 980 * 0.5 * 0.01 = 4.9
    const data = computeSimpleDrag({
      cd: 0.5,
      areaM2: 0.01,
      velocityMs: 40,
      rhoKgM3: 1.225,
      massKg: 0.5,
    });

    assert.ok(Math.abs(data.dynamicPressurePa - 980) < 1e-9);
    assert.ok(Math.abs(data.dragForceN - 4.9) < 1e-9);
    assert.ok(Math.abs((data.dragAccelMs2 ?? 0) - 9.8) < 1e-9);
    assert.equal(data.cd, 0.5);
    assert.equal(data.velocityMs, 40);
  });

  it('returns zero force at zero velocity', () => {
    const data = computeSimpleDrag({
      cd: 0.5,
      areaM2: 0.01,
      velocityMs: 0,
    });
    assert.equal(data.dragForceN, 0);
    assert.equal(data.dynamicPressurePa, 0);
    assert.equal(data.dragAccelMs2, null);
  });

  it('rejects non-positive area', () => {
    assert.throws(
      () =>
        computeSimpleDrag({
          cd: 0.5,
          areaM2: 0,
          velocityMs: 10,
        }),
      /areaM2/
    );
  });
});

describe('simpleDragModule', () => {
  it('emits steps, references, and design-based golden drag', () => {
    const registry = new ModuleRegistry();
    registry.register(massPropertiesModule);
    registry.register(simpleDragModule);

    const mass = massPropertiesModule.run(undefined, {
      design: baseDesign,
      config: { dt: 0.01, tMax: 1 },
      previous: new Map(),
    });

    const previous = new Map([[mass.moduleId, mass]]);
    const result = simpleDragModule.run(undefined, {
      design: baseDesign,
      config: { dt: 0.01, tMax: 1 },
      previous,
    });

    assert.equal(result.moduleId, 'aero.simple-drag');
    assert.ok(simpleDragModule.references.length >= 2);
    assert.ok(result.steps.length >= 3);
    assert.ok(result.steps.some((s) => s.latex?.includes('rho') || s.latex?.includes('\\rho')));

    const data = result.data as SimpleDragData;
    // q = 0.5 * 1.225 * 50² = 1531.25
    // D = 1531.25 * 0.45 * 0.005 = 3.4453125
    assert.ok(Math.abs(data.dynamicPressurePa - 1531.25) < 1e-6);
    assert.ok(Math.abs(data.dragForceN - 3.4453125) < 1e-6);
    assert.equal(data.velocityMs, 50);
    assert.equal(data.massKg, 0.5);
    assert.ok(data.dragAccelMs2 != null && data.dragAccelMs2 > 0);
  });

  it('uses DEFAULT_VELOCITY_SAMPLE_MS when design has no sample', () => {
    const design: RocketDesignSnapshot = {
      ...baseDesign,
      velocitySampleMs: undefined,
    };
    const result = simpleDragModule.run(undefined, {
      design,
      config: { dt: 0.01, tMax: 1 },
      previous: new Map(),
    });
    assert.equal(
      (result.data as SimpleDragData).velocityMs,
      DEFAULT_VELOCITY_SAMPLE_MS
    );
  });

  it('accepts input overrides', () => {
    const result = simpleDragModule.run(
      { velocityMs: 10, cd: 1, areaM2: 0.02, rhoKgM3: 1 },
      {
        design: baseDesign,
        config: { dt: 0.01, tMax: 1 },
        previous: new Map(),
      }
    );
    const data = result.data as SimpleDragData;
    // q = 0.5 * 1 * 100 = 50; D = 50 * 1 * 0.02 = 1
    assert.ok(Math.abs(data.dragForceN - 1) < 1e-9);
  });
});
