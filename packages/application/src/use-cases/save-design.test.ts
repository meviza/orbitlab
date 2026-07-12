import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { User } from "@orbitlab/domain";
import { SaveDesignUseCase } from "./save-design.js";
import {
  FakeAuthPort,
  InMemoryDesignRepository,
  SequentialIdGenerator,
} from "../test/fakes.js";

describe("SaveDesignUseCase", () => {
  it("creates a design for the current user (happy path)", async () => {
    const owner = User.create({
      id: "user-1",
      email: "owner@orbitlab.test",
      plan: "free",
      eduVerified: false,
    });
    const designs = new InMemoryDesignRepository();
    const ids = new SequentialIdGenerator("design");
    const useCase = new SaveDesignUseCase({
      designs,
      auth: new FakeAuthPort(owner),
      ids,
    });

    const result = await useCase.execute({
      title: "  Model Rocket  ",
      components: [
        {
          id: "body-1",
          type: "body",
          name: "Body tube",
          params: { lengthM: 0.5 },
        },
      ],
      metadata: { notes: "first build" },
    });

    assert.equal(result.ok, true);
    if (!result.ok) return;

    assert.equal(result.value.id, "design-1");
    assert.equal(result.value.ownerId, "user-1");
    assert.equal(result.value.title, "Model Rocket");
    assert.equal(result.value.components.length, 1);
    assert.equal(result.value.components[0]?.name, "Body tube");
    assert.equal(result.value.metadata.notes, "first build");

    const stored = designs.all();
    assert.equal(stored.length, 1);
    assert.equal(stored[0]?.id, "design-1");
    assert.equal(stored[0]?.isOwnedBy("user-1"), true);
  });
});
