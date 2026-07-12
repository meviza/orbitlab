import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  createDefaultRegistry,
  DEFAULT_FREE_MODULE_IDS,
  FULL_FREE_MODULE_IDS,
} from '../factory.js';
import { SimulationRunner } from '../runner.js';
import type { RocketDesignSnapshot } from '../types.js';
import type { SimpleDragData } from './simple-drag.js';
import type { StabilityMarginLiteData } from './stability-margin-lite.js';
import type { ToyVerticalFlightData } from './toy-vertical-flight.js';

const design: RocketDesignSnapshot = {
  massKg: 0.5,
  cd: 0.45,
  areaM2: 0.005,
  thrustN: 20,
  burnTimeS: 1.5,
  lengthM: 0.5,
  diameterM: 0.025,
  velocitySampleMs: 50,
  components: [
    {
      id: 'body',
      massKg: 0.3,
      name: 'Body tube',
      kind: 'body',
      stationM: 0.08,
      lengthM: 0.35,
      diameterM: 0.025,
    },
    {
      id: 'nose',
      massKg: 0.1,
      name: 'Nose cone',
      kind: 'nose',
      stationM: 0,
      lengthM: 0.08,
      diameterM: 0.025,
    },
    {
      id: 'fins',
      massKg: 0.1,
      name: 'Fins',
      kind: 'fin',
      stationM: 0.4,
      rootChordM: 0.06,
      tipChordM: 0.03,
      spanM: 0.04,
      finCount: 3,
    },
  ],
};

describe('free module id sets', () => {
  it('DEFAULT is mass + flight only (fast demo)', () => {
    assert.deepEqual([...DEFAULT_FREE_MODULE_IDS], [
      'mass.properties',
      'flight.toy-vertical',
    ]);
  });

  it('FULL includes stability + aero in educational order', () => {
    assert.deepEqual([...FULL_FREE_MODULE_IDS], [
      'mass.properties',
      'stability.margin-lite',
      'aero.simple-drag',
      'flight.toy-vertical',
    ]);
  });
});

describe('FULL_FREE_MODULE_IDS pipeline integration', () => {
  it('runs all free modules with golden-ish assertions', () => {
    const runner = new SimulationRunner();
    const summary = runner.run(design, [...FULL_FREE_MODULE_IDS]);

    assert.equal(summary.ordered.length, 4);
    assert.ok(summary.byId['mass.properties']);
    assert.ok(summary.byId['stability.margin-lite']);
    assert.ok(summary.byId['aero.simple-drag']);
    assert.ok(summary.byId['flight.toy-vertical']);

    const mass = summary.byId['mass.properties']!.data as {
      totalMassKg: number;
      source: string;
    };
    assert.equal(mass.totalMassKg, 0.5);
    assert.equal(mass.source, 'components-sum');

    const stab = summary.byId['stability.margin-lite']!
      .data as StabilityMarginLiteData;
    assert.ok(summary.byId['stability.margin-lite']!.steps.length >= 3);
    assert.ok(stab.assumptions.some((a) => /not a full Barrowman/i.test(a)));
    assert.ok(stab.staticMarginCalibers !== 0 || stab.cpFromNoseM >= 0);
    assert.ok(Number.isFinite(stab.staticMarginCalibers));

    const aero = summary.byId['aero.simple-drag']!.data as SimpleDragData;
    assert.ok(aero.dragForceN > 0);
    assert.equal(aero.velocityMs, 50);
    // Uses mass from previous mass.properties
    assert.equal(aero.massKg, 0.5);
    assert.ok(summary.byId['aero.simple-drag']!.steps.some((s) => s.latex));

    const flight = summary.byId['flight.toy-vertical']!
      .data as ToyVerticalFlightData;
    assert.ok(flight.maxAltitudeM > 0);
    assert.ok(flight.samples.length > 10);
  });

  it('registry registers all four free modules', () => {
    const reg = createDefaultRegistry();
    const free = reg.listByTier('free');
    const ids = free.map((m) => m.id).sort();
    assert.deepEqual(ids, [
      'aero.simple-drag',
      'flight.toy-vertical',
      'mass.properties',
      'stability.margin-lite',
    ]);
    assert.equal(reg.size, 4);
  });

  it('DEFAULT pipeline still only runs two modules', () => {
    const runner = new SimulationRunner();
    const summary = runner.run(design, [...DEFAULT_FREE_MODULE_IDS]);
    assert.equal(summary.ordered.length, 2);
    assert.equal(summary.ordered[0]!.moduleId, 'mass.properties');
    assert.equal(summary.ordered[1]!.moduleId, 'flight.toy-vertical');
  });
});
