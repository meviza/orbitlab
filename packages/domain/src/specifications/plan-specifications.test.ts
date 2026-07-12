import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { User } from "../entities/user.js";
import {
  canRunModule,
  isFreePlan,
  isPaidPlan,
  isProPlan,
} from "./plan-specifications.js";

function user(
  plan: "free" | "pro" | "edu",
  eduVerified = plan === "edu"
): User {
  return User.create({
    id: "u1",
    email: "pilot@orbitlab.test",
    plan,
    eduVerified,
  });
}

describe("canRunModule", () => {
  it("allows free modules for free plan users", () => {
    assert.equal(canRunModule(user("free"), "free"), true);
  });

  it("denies pro modules for free plan users", () => {
    assert.equal(canRunModule(user("free"), "pro"), false);
  });

  it("allows pro modules for pro plan users", () => {
    assert.equal(canRunModule(user("pro"), "pro"), true);
  });

  it("allows pro modules for verified edu users", () => {
    assert.equal(canRunModule(user("edu", true), "pro"), true);
  });
});

describe("isProPlan", () => {
  it("is true only for pro plan", () => {
    assert.equal(isProPlan(user("pro")), true);
    assert.equal(isProPlan(user("free")), false);
    assert.equal(isProPlan(user("edu", true)), false);
  });
});

describe("isPaidPlan / isFreePlan", () => {
  it("classifies free vs paid correctly", () => {
    assert.equal(isFreePlan(user("free")), true);
    assert.equal(isPaidPlan(user("free")), false);

    assert.equal(isFreePlan(user("pro")), false);
    assert.equal(isPaidPlan(user("pro")), true);

    assert.equal(isPaidPlan(user("edu", true)), true);
  });
});
