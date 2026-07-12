import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { RocketDesign, User } from "@orbitlab/domain";
import { RunSimulationUseCase } from "./run-simulation.js";
import {
  FakeAuthPort,
  FakeSimulationRunner,
  FixedClock,
  InMemoryDesignRepository,
  InMemorySimRunRepository,
  MapModuleTierLookup,
  PlanEntitlements,
  SequentialIdGenerator,
} from "../test/fakes.js";

const FIXED_NOW = new Date("2024-06-01T12:00:00.000Z");

function freeUser(id = "user-1"): User {
  return User.create({
    id,
    email: "free@orbitlab.test",
    plan: "free",
    eduVerified: false,
  });
}

function ownedDesign(ownerId: string, id = "design-1"): RocketDesign {
  return RocketDesign.create({
    id,
    ownerId,
    title: "Test rocket",
    components: [
      {
        id: "body-1",
        type: "body",
        name: "Body",
        params: {},
      },
    ],
  });
}

describe("RunSimulationUseCase", () => {
  it("fails with ENTITLEMENT when a pro module is requested on free plan", async () => {
    const user = freeUser();
    const design = ownedDesign(user.id);
    const runner = new FakeSimulationRunner();

    const useCase = new RunSimulationUseCase({
      designs: new InMemoryDesignRepository([design]),
      simRuns: new InMemorySimRunRepository(),
      auth: new FakeAuthPort(user),
      runner,
      entitlements: new PlanEntitlements(),
      moduleTiers: new MapModuleTierLookup({
        "mass-properties": "free",
        "cfd-analysis": "pro",
      }),
      ids: new SequentialIdGenerator("run"),
      clock: new FixedClock(FIXED_NOW),
    });

    const result = await useCase.execute({
      designId: design.id,
      moduleIds: ["cfd-analysis"],
    });

    assert.equal(result.ok, false);
    if (result.ok) return;

    assert.equal(result.error.code, "ENTITLEMENT");
    assert.match(result.error.message, /cfd-analysis/);
    assert.match(result.error.message, /pro/i);
    assert.equal(runner.calls.length, 0);
  });

  it("succeeds with free modules using a fake SimulationRunnerPort", async () => {
    const user = freeUser();
    const design = ownedDesign(user.id);
    const simRuns = new InMemorySimRunRepository();
    const runner = new FakeSimulationRunner((d, moduleIds) => ({
      id: "ignored-by-use-case",
      designId: d.id,
      moduleIds: [...moduleIds],
      status: "completed",
      summary: { apogeeM: 95.5, maxVelocityMs: 40 },
      createdAt: FIXED_NOW.toISOString(),
      samples: [
        { t: 0, altitude: 0 },
        { t: 1, altitude: 20 },
      ],
      moduleOutputs: {
        "mass-properties": { totalMassKg: 0.5 },
        "toy-vertical": { maxAltitudeM: 95.5 },
      },
    }));

    const useCase = new RunSimulationUseCase({
      designs: new InMemoryDesignRepository([design]),
      simRuns,
      auth: new FakeAuthPort(user),
      runner,
      entitlements: new PlanEntitlements(),
      moduleTiers: new MapModuleTierLookup({
        "mass-properties": "free",
        "toy-vertical": "free",
      }),
      ids: new SequentialIdGenerator("run"),
      clock: new FixedClock(FIXED_NOW),
    });

    const result = await useCase.execute({
      designId: design.id,
      moduleIds: ["mass-properties", "toy-vertical"],
    });

    assert.equal(result.ok, true);
    if (!result.ok) return;

    assert.equal(result.value.id, "run-1");
    assert.equal(result.value.designId, design.id);
    assert.deepEqual(result.value.moduleIds, [
      "mass-properties",
      "toy-vertical",
    ]);
    assert.equal(result.value.status, "completed");
    assert.equal(result.value.summary.apogeeM, 95.5);
    assert.equal(result.value.createdAt, FIXED_NOW.toISOString());
    assert.ok(result.value.samples);
    assert.equal(result.value.samples?.length, 2);
    assert.ok(result.value.moduleOutputs?.["mass-properties"]);

    assert.equal(runner.calls.length, 1);
    assert.deepEqual(runner.calls[0]?.moduleIds, [
      "mass-properties",
      "toy-vertical",
    ]);

    const persisted = simRuns.all();
    assert.equal(persisted.length, 1);
    assert.equal(persisted[0]?.status, "completed");
    assert.equal(persisted[0]?.id, "run-1");
  });
});
