import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DomainError } from "../shared/errors.js";
import { User } from "./user.js";

describe("User.create", () => {
  it("creates a free user with normalized email", () => {
    const user = User.create({
      id: "u1",
      email: "  Alice@Example.COM ",
      plan: "free",
      eduVerified: false,
    });

    assert.equal(user.id, "u1");
    assert.equal(user.email, "alice@example.com");
    assert.equal(user.plan, "free");
    assert.equal(user.eduVerified, false);
  });

  it("rejects invalid email", () => {
    assert.throws(
      () =>
        User.create({
          id: "u1",
          email: "not-an-email",
          plan: "free",
          eduVerified: false,
        }),
      (e: unknown) => {
        assert.ok(e instanceof DomainError);
        assert.equal(e.code, "VALIDATION");
        assert.match(e.message, /email is invalid/i);
        return true;
      }
    );
  });

  it("rejects empty email", () => {
    assert.throws(
      () =>
        User.create({
          id: "u1",
          email: "   ",
          plan: "free",
          eduVerified: false,
        }),
      (e: unknown) => {
        assert.ok(e instanceof DomainError);
        assert.equal(e.code, "VALIDATION");
        return true;
      }
    );
  });

  it("rejects edu plan without eduVerified", () => {
    assert.throws(
      () =>
        User.create({
          id: "u1",
          email: "student@university.edu",
          plan: "edu",
          eduVerified: false,
        }),
      (e: unknown) => {
        assert.ok(e instanceof DomainError);
        assert.equal(e.code, "VALIDATION");
        assert.match(e.message, /eduVerified/i);
        return true;
      }
    );
  });

  it("allows edu plan when eduVerified is true", () => {
    const user = User.create({
      id: "u1",
      email: "student@university.edu",
      plan: "edu",
      eduVerified: true,
    });
    assert.equal(user.plan, "edu");
    assert.equal(user.eduVerified, true);
  });
});
