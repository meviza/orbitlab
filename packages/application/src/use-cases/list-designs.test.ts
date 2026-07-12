import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { RocketDesign, User } from "@orbitlab/domain";
import { ListDesignsUseCase } from "./list-designs.js";
import {
  FakeAuthPort,
  InMemoryDesignRepository,
} from "../test/fakes.js";

describe("ListDesignsUseCase", () => {
  it("returns only designs owned by the current user", async () => {
    const owner = User.create({
      id: "owner-1",
      email: "owner@orbitlab.test",
      plan: "free",
      eduVerified: false,
    });

    const mineA = RocketDesign.create({
      id: "d-a",
      ownerId: owner.id,
      title: "Alpha",
    });
    const mineB = RocketDesign.create({
      id: "d-b",
      ownerId: owner.id,
      title: "Bravo",
    });
    const other = RocketDesign.create({
      id: "d-other",
      ownerId: "someone-else",
      title: "Not mine",
    });

    const designs = new InMemoryDesignRepository([mineA, mineB, other]);
    const useCase = new ListDesignsUseCase({
      designs,
      auth: new FakeAuthPort(owner),
    });

    const result = await useCase.execute();

    assert.equal(result.ok, true);
    if (!result.ok) return;

    assert.equal(result.value.length, 2);
    const ids = new Set(result.value.map((d) => d.id));
    assert.ok(ids.has("d-a"));
    assert.ok(ids.has("d-b"));
    assert.ok(!ids.has("d-other"));
    assert.ok(result.value.every((d) => d.ownerId === owner.id));
  });
});
