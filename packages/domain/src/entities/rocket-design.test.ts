import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DomainError } from "../shared/errors.js";
import { RocketDesign } from "./rocket-design.js";

describe("RocketDesign.create", () => {
  it("creates a design with trimmed title", () => {
    const design = RocketDesign.create({
      id: "d1",
      ownerId: "u1",
      title: "  Alpha Rocket  ",
    });

    assert.equal(design.id, "d1");
    assert.equal(design.ownerId, "u1");
    assert.equal(design.title, "Alpha Rocket");
    assert.equal(design.components.length, 0);
  });

  it("rejects empty title", () => {
    assert.throws(
      () =>
        RocketDesign.create({
          id: "d1",
          ownerId: "u1",
          title: "",
        }),
      (e: unknown) => {
        assert.ok(e instanceof DomainError);
        assert.equal(e.code, "VALIDATION");
        assert.match(e.message, /title must be non-empty/i);
        return true;
      }
    );
  });

  it("rejects whitespace-only title", () => {
    assert.throws(
      () =>
        RocketDesign.create({
          id: "d1",
          ownerId: "u1",
          title: "   \t  ",
        }),
      (e: unknown) => {
        assert.ok(e instanceof DomainError);
        assert.equal(e.code, "VALIDATION");
        assert.match(e.message, /title must be non-empty/i);
        return true;
      }
    );
  });
});
