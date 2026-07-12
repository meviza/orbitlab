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
import type { StabilityBarrowmanData } from './stability-barrowman.js';
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

  it('FULL includes wave-16 free suite in educational order', () => {
    assert.deepEqual([...FULL_FREE_MODULE_IDS], [
      'mass.properties',
      'motor.thrust-curve',
      'aero.atmosphere-isa',
      'stability.barrowman',
      'aero.simple-drag',
      'aero.wind-constant',
      'flight.toy-vertical',
      'recovery.deploy-simple',
    ]);
  });
});

describe('FULL_FREE_MODULE_IDS pipeline integration', () => {
  it('runs all free modules with golden-ish assertions', () => {
    const runner = new SimulationRunner();
    const summary = runner.run(design, [...FULL_FREE_MODULE_IDS]);

    assert.equal(summary.ordered.length, 8);
    assert.ok(summary.byId['mass.properties']);
    assert.ok(summary.byId['motor.thrust-curve']);
    assert.ok(summary.byId['aero.atmosphere-isa']);
    assert.ok(summary.byId['stability.barrowman']);
    assert.ok(summary.byId['aero.simple-drag']);
    assert.ok(summary.byId['aero.wind-constant']);
    assert.ok(summary.byId['flight.toy-vertical']);
    assert.ok(summary.byId['recovery.deploy-simple']);

    const mass = summary.byId['mass.properties']!.data as {
      totalMassKg: number;
      source: string;
    };
    assert.equal(mass.totalMassKg, 0.5);
    assert.equal(mass.source, 'components-sum');

    const stab = summary.byId['stability.barrowman']!
      .data as StabilityBarrowmanData;
    assert.ok(summary.byId['stability.barrowman']!.steps.length >= 5);
    assert.ok(stab.assumptions.some((a) => /Barrowman/i.test(a)));
    assert.ok(stab.assumptions.some((a) => /educational/i.test(a)));
    assert.ok(Number.isFinite(stab.stabilityCalibers));
    assert.ok(stab.caliberM > 0);
    assert.ok(stab.cpFromNoseM > 0);

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

  it('registry registers wave-16 free modules + optional margin-lite', () => {
    const reg = createDefaultRegistry();
    const free = reg.listByTier('free');
    const ids = free.map((m) => m.id).sort();
    assert.deepEqual(ids, [
      'aero.atmosphere-isa',
      'aero.simple-drag',
      'aero.wind-constant',
      'flight.toy-vertical',
      'mass.properties',
      'motor.thrust-curve',
      'recovery.deploy-simple',
      'stability.barrowman',
      'stability.margin-lite',
    ]);
    assert.equal(reg.size, 9);
    assert.ok(reg.has('stability.margin-lite'));
    assert.ok(reg.has('stability.barrowman'));
    assert.ok(reg.has('motor.thrust-curve'));
  });

  it('DEFAULT pipeline still only runs two modules', () => {
    const runner = new SimulationRunner();
    const summary = runner.run(design, [...DEFAULT_FREE_MODULE_IDS]);
    assert.equal(summary.ordered.length, 2);
    assert.equal(summary.ordered[0]!.moduleId, 'mass.properties');
    assert.equal(summary.ordered[1]!.moduleId, 'flight.toy-vertical');
  });
});
