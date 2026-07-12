import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { RocketDesignSnapshot } from '../types.js';
import { SEA_LEVEL_RHO_KG_M3, STANDARD_G } from '../types.js';
import {
  computeRecoveryDeploy,
  DEFAULT_DEPLOY_ALTITUDE_M,
  DEFAULT_PARACHUTE_AREA_M2,
  DEFAULT_PARACHUTE_CD,
  parachuteTerminalVelocityMs,
  recoveryDeploySimpleModule,
  type RecoveryDeployData,
} from './recovery-deploy.js';

const baseDesign: RocketDesignSnapshot = {
  massKg: 0.5,
  cd: 0.45,
  areaM2: 0.005,
  thrustN: 20,
  burnTimeS: 1.5,
  rhoKgM3: 1.225,
};

describe('parachuteTerminalVelocityMs', () => {
  it('matches analytic golden values for known m, Cd, A', () => {
    // v = √(2 m g / (ρ Cd A))
    // m=0.5, g=9.80665, ρ=1.225, Cd=1.5, A=0.3
    // denom = 1.225 * 1.5 * 0.3 = 0.55125
    // num = 2 * 0.5 * 9.80665 = 9.80665
    // v = √(9.80665 / 0.55125) = √17.7902040816… ≈ 4.21780053
    const m = 0.5;
    const cd = 1.5;
    const area = 0.3;
    const rho = 1.225;
    const g = STANDARD_G;
    const expected = Math.sqrt((2 * m * g) / (rho * cd * area));

    const v = parachuteTerminalVelocityMs({
      massKg: m,
      parachuteCd: cd,
      parachuteAreaM2: area,
      rhoKgM3: rho,
      g,
    });

    assert.ok(Math.abs(v - expected) < 1e-12);
    assert.ok(Math.abs(v - 4.21780053) < 1e-6);
  });

  it('rejects non-positive area or Cd', () => {
    assert.throws(
      () =>
        parachuteTerminalVelocityMs({
          massKg: 1,
          parachuteCd: 0,
          parachuteAreaM2: 0.3,
        }),
      /parachuteCd/
    );
    assert.throws(
      () =>
        parachuteTerminalVelocityMs({
          massKg: 1,
          parachuteCd: 1.5,
          parachuteAreaM2: 0,
        }),
      /parachuteAreaM2/
    );
  });
});

describe('computeRecoveryDeploy', () => {
  it('computes descent time as h / v_term', () => {
    const m = 0.5;
    const cd = 1.5;
    const area = 0.3;
    const h = 100;
    const v = Math.sqrt(
      (2 * m * STANDARD_G) / (SEA_LEVEL_RHO_KG_M3 * cd * area)
    );

    const data = computeRecoveryDeploy({
      massKg: m,
      parachuteCd: cd,
      parachuteAreaM2: area,
      deployAltitudeM: h,
      rhoKgM3: SEA_LEVEL_RHO_KG_M3,
    });

    assert.ok(Math.abs(data.terminalVelocityMs - v) < 1e-12);
    assert.ok(Math.abs(data.descentTimeS - h / v) < 1e-12);
    assert.equal(data.deployAltitudeM, h);
    assert.equal(data.parachuteCd, cd);
    assert.equal(data.parachuteAreaM2, area);
  });

  it('zero altitude yields zero descent time', () => {
    const data = computeRecoveryDeploy({
      massKg: 1,
      parachuteCd: 1.5,
      parachuteAreaM2: 0.3,
      deployAltitudeM: 0,
    });
    assert.equal(data.descentTimeS, 0);
    assert.ok(data.terminalVelocityMs > 0);
  });
});

describe('recoveryDeploySimpleModule', () => {
  it('uses defaults and design mass; emits latex steps', () => {
    const result = recoveryDeploySimpleModule.run(undefined, {
      design: baseDesign,
      config: { dt: 0.01, tMax: 1 },
      previous: new Map(),
    });

    assert.equal(result.moduleId, 'recovery.deploy-simple');
    assert.equal(recoveryDeploySimpleModule.tier, 'free');
    assert.ok(recoveryDeploySimpleModule.references.length >= 2);
    assert.ok(result.steps.length >= 3);
    assert.ok(
      result.steps.some(
        (s) =>
          s.latex?.includes('v_{\\mathrm{term}}') ||
          s.latex?.includes('v_') ||
          (s.latex?.includes('sqrt') ?? false) ||
          (s.latex?.includes('\\sqrt') ?? false)
      )
    );

    const data = result.data as RecoveryDeployData;
    assert.equal(data.parachuteCd, DEFAULT_PARACHUTE_CD);
    assert.equal(data.parachuteAreaM2, DEFAULT_PARACHUTE_AREA_M2);
    assert.equal(data.deployAltitudeM, DEFAULT_DEPLOY_ALTITUDE_M);
    assert.equal(data.deployAltitudeSource, 'default');
    assert.equal(data.massKg, 0.5);

    const expectedV = Math.sqrt(
      (2 * 0.5 * STANDARD_G) /
        (SEA_LEVEL_RHO_KG_M3 * DEFAULT_PARACHUTE_CD * DEFAULT_PARACHUTE_AREA_M2)
    );
    assert.ok(Math.abs(data.terminalVelocityMs - expectedV) < 1e-9);
    assert.ok(
      Math.abs(data.descentTimeS - DEFAULT_DEPLOY_ALTITUDE_M / expectedV) < 1e-9
    );
  });

  it('prefers flight.toy-vertical maxAltitude for deploy altitude', () => {
    const previous = new Map([
      [
        'flight.toy-vertical',
        {
          moduleId: 'flight.toy-vertical',
          data: { maxAltitudeM: 87.5 },
          steps: [],
        },
      ],
    ]);

    const result = recoveryDeploySimpleModule.run(undefined, {
      design: baseDesign,
      config: { dt: 0.01, tMax: 1 },
      previous,
    });

    const data = result.data as RecoveryDeployData;
    assert.equal(data.deployAltitudeM, 87.5);
    assert.equal(
      data.deployAltitudeSource,
      'flight.toy-vertical.maxAltitudeM'
    );
    assert.ok(
      Math.abs(data.descentTimeS - 87.5 / data.terminalVelocityMs) < 1e-9
    );
  });

  it('uses design metadata parachute fields when present', () => {
    const design = {
      ...baseDesign,
      parachuteCd: 1.2,
      parachuteAreaM2: 0.4,
      deployAltitudeM: 50,
    } as RocketDesignSnapshot;

    const result = recoveryDeploySimpleModule.run(undefined, {
      design,
      config: { dt: 0.01, tMax: 1 },
      previous: new Map(),
    });

    const data = result.data as RecoveryDeployData;
    assert.equal(data.parachuteCd, 1.2);
    assert.equal(data.parachuteAreaM2, 0.4);
    assert.equal(data.deployAltitudeM, 50);
    assert.equal(data.deployAltitudeSource, 'design.deployAltitudeM');

    const expectedV = Math.sqrt(
      (2 * 0.5 * STANDARD_G) / (SEA_LEVEL_RHO_KG_M3 * 1.2 * 0.4)
    );
    assert.ok(Math.abs(data.terminalVelocityMs - expectedV) < 1e-9);
  });

  it('reads nested design.metadata keys', () => {
    const design = {
      ...baseDesign,
      metadata: {
        parachuteCd: 2,
        parachuteAreaM2: 0.25,
        deployAltitudeM: 40,
      },
    } as RocketDesignSnapshot;

    const result = recoveryDeploySimpleModule.run(undefined, {
      design,
      config: { dt: 0.01, tMax: 1 },
      previous: new Map(),
    });

    const data = result.data as RecoveryDeployData;
    assert.equal(data.parachuteCd, 2);
    assert.equal(data.parachuteAreaM2, 0.25);
    assert.equal(data.deployAltitudeM, 40);
    assert.equal(data.deployAltitudeSource, 'design.metadata.deployAltitudeM');
  });

  it('accepts input overrides over flight and design', () => {
    const previous = new Map([
      [
        'flight.toy-vertical',
        {
          moduleId: 'flight.toy-vertical',
          data: { maxAltitudeM: 200 },
          steps: [],
        },
      ],
      [
        'mass.properties',
        {
          moduleId: 'mass.properties',
          data: { totalMassKg: 0.8 },
          steps: [],
        },
      ],
    ]);

    const result = recoveryDeploySimpleModule.run(
      {
        parachuteCd: 1,
        parachuteAreaM2: 0.5,
        deployAltitudeM: 10,
        massKg: 1,
        rhoKgM3: 1,
      },
      {
        design: baseDesign,
        config: { dt: 0.01, tMax: 1 },
        previous,
      }
    );

    const data = result.data as RecoveryDeployData;
    assert.equal(data.deployAltitudeSource, 'input-override');
    assert.equal(data.massKg, 1);
    assert.equal(data.deployAltitudeM, 10);
    // v = √(2*1*9.80665 / (1*1*0.5)) = √(39.2266) ≈ 6.2631
    const expectedV = Math.sqrt((2 * 1 * STANDARD_G) / (1 * 1 * 0.5));
    assert.ok(Math.abs(data.terminalVelocityMs - expectedV) < 1e-9);
    assert.ok(Math.abs(data.descentTimeS - 10 / expectedV) < 1e-9);
  });

  it('uses mass.properties totalMassKg when present', () => {
    const previous = new Map([
      [
        'mass.properties',
        {
          moduleId: 'mass.properties',
          data: { totalMassKg: 0.75 },
          steps: [],
        },
      ],
    ]);

    const result = recoveryDeploySimpleModule.run(
      { deployAltitudeM: 20, parachuteCd: 1.5, parachuteAreaM2: 0.3 },
      {
        design: baseDesign,
        config: { dt: 0.01, tMax: 1 },
        previous,
      }
    );

    const data = result.data as RecoveryDeployData;
    assert.equal(data.massKg, 0.75);
    const expectedV = Math.sqrt(
      (2 * 0.75 * STANDARD_G) / (SEA_LEVEL_RHO_KG_M3 * 1.5 * 0.3)
    );
    assert.ok(Math.abs(data.terminalVelocityMs - expectedV) < 1e-9);
  });
});
