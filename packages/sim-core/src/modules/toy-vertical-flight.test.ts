import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createDefaultRegistry, DEFAULT_FREE_MODULE_IDS } from '../factory.js';
import { SimulationPipeline } from '../pipeline.js';
import { SimulationRunner } from '../runner.js';
import type { RocketDesignSnapshot } from '../types.js';
import {
  simulateToyVertical,
  type ToyVerticalFlightData,
} from './toy-vertical-flight.js';

const design: RocketDesignSnapshot = {
  massKg: 0.5,
  cd: 0.45,
  areaM2: 0.005,
  thrustN: 20,
  burnTimeS: 1.5,
  components: [
    { id: 'body', massKg: 0.3, name: 'Body tube' },
    { id: 'nose', massKg: 0.1, name: 'Nose cone' },
    { id: 'fins', massKg: 0.1, name: 'Fins' },
  ],
};

describe('simulateToyVertical', () => {
  it('reaches positive max altitude with thrust', () => {
    const samples = simulateToyVertical(
      {
        massKg: design.massKg,
        thrustN: design.thrustN,
        burnTimeS: design.burnTimeS,
        cd: design.cd,
        areaM2: design.areaM2,
      },
      { dt: 0.01, tMax: 30 }
    );

    assert.ok(samples.length > 2, 'expected trajectory samples');
    const maxH = Math.max(...samples.map((s) => s.altitude));
    assert.ok(maxH > 0, `expected max altitude > 0, got ${maxH}`);
    // ground contact or coast end
    const last = samples[samples.length - 1]!;
    assert.ok(last.altitude >= 0);
  });

  it('stays on pad when thrust is zero and starts at rest', () => {
    const samples = simulateToyVertical(
      {
        massKg: 1,
        thrustN: 0,
        burnTimeS: 0,
        cd: 0.5,
        areaM2: 0.01,
      },
      { dt: 0.01, tMax: 1 }
    );
    const maxH = Math.max(...samples.map((s) => s.altitude));
    assert.ok(maxH < 1e-6, `expected no climb without thrust, maxH=${maxH}`);
  });

  it('rk4 also produces positive altitude under thrust', () => {
    const samples = simulateToyVertical(
      {
        massKg: design.massKg,
        thrustN: design.thrustN,
        burnTimeS: design.burnTimeS,
        cd: design.cd,
        areaM2: design.areaM2,
        integrator: 'rk4',
      },
      { dt: 0.01, tMax: 30 }
    );
    const maxH = Math.max(...samples.map((s) => s.altitude));
    assert.ok(maxH > 0);
  });
});

describe('SimulationRunner / pipeline', () => {
  it('runs mass + toy vertical free pipeline with golden assertion', () => {
    const runner = new SimulationRunner();
    const events: string[] = [];
    const summary = runner.run(design, [...DEFAULT_FREE_MODULE_IDS], {
      onProgress: (e) => events.push(e.type),
    });

    assert.equal(summary.ordered.length, 2);
    assert.ok(summary.byId['mass.properties']);
    assert.ok(summary.byId['flight.toy-vertical']);

    const flight = summary.byId['flight.toy-vertical']!
      .data as ToyVerticalFlightData;
    assert.ok(
      flight.maxAltitudeM > 0,
      `golden: maxAltitudeM > 0, got ${flight.maxAltitudeM}`
    );
    assert.ok(flight.samples.length > 10);
    assert.ok(
      (summary.byId['flight.toy-vertical']!.series?.altitude?.length ?? 0) > 10
    );

    // mass from components
    const mass = summary.byId['mass.properties']!.data as {
      totalMassKg: number;
      source: string;
    };
    assert.equal(mass.totalMassKg, 0.5);
    assert.equal(mass.source, 'components-sum');

    assert.ok(events.includes('pipeline:start'));
    assert.ok(events.includes('module:done'));
    assert.ok(events.includes('pipeline:done'));
  });

  it('registry lists free modules', () => {
    const reg = createDefaultRegistry();
    const free = reg.listByTier('free');
    assert.ok(free.some((m) => m.id === 'flight.toy-vertical'));
    assert.ok(free.some((m) => m.id === 'mass.properties'));
    assert.ok(free.some((m) => m.id === 'aero.simple-drag'));
    assert.ok(free.some((m) => m.id === 'stability.margin-lite'));
    assert.equal(reg.listByTier('pro').length, 0);
  });

  it('pipeline throws on unknown module id', () => {
    const pipeline = new SimulationPipeline(createDefaultRegistry());
    assert.throws(
      () =>
        pipeline.run({
          design,
          config: { dt: 0.01, tMax: 5 },
          moduleIds: ['does.not.exist'],
        }),
      /Unknown module/
    );
  });
});
