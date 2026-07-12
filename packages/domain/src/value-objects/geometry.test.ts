import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DomainError } from "../shared/errors.js";
import {
  assertNonNegative,
  assertPositiveLength,
  circleArea,
  cylinderVolume,
  diameterToRadius,
  finPlanformArea,
  radiusToDiameter,
} from "./geometry.js";

function assertValidation(
  fn: () => unknown,
  messagePattern?: RegExp
): void {
  assert.throws(fn, (e: unknown) => {
    assert.ok(e instanceof DomainError);
    assert.equal(e.code, "VALIDATION");
    if (messagePattern) {
      assert.match(e.message, messagePattern);
    }
    return true;
  });
}

describe("assertPositiveLength", () => {
  it("returns positive finite lengths", () => {
    assert.equal(assertPositiveLength(1.5), 1.5);
    assert.equal(assertPositiveLength(1e-9), 1e-9);
  });

  it("rejects zero, negative, and non-finite", () => {
    assertValidation(() => assertPositiveLength(0), /positive/i);
    assertValidation(() => assertPositiveLength(-0.1), /positive/i);
    assertValidation(() => assertPositiveLength(NaN), /finite/i);
    assertValidation(() => assertPositiveLength(Infinity), /finite/i);
    assertValidation(() => assertPositiveLength(-Infinity), /finite/i);
  });

  it("uses custom label in the error message", () => {
    assertValidation(
      () => assertPositiveLength(-1, "body length"),
      /body length/i
    );
  });
});

describe("assertNonNegative", () => {
  it("allows zero and positive values", () => {
    assert.equal(assertNonNegative(0), 0);
    assert.equal(assertNonNegative(2), 2);
  });

  it("rejects negative and non-finite", () => {
    assertValidation(() => assertNonNegative(-1e-12), /non-negative/i);
    assertValidation(() => assertNonNegative(NaN), /finite/i);
    assertValidation(() => assertNonNegative(Infinity), /finite/i);
  });
});

describe("diameterToRadius / radiusToDiameter", () => {
  it("converts diameter and radius", () => {
    assert.equal(diameterToRadius(0.05), 0.025);
    assert.equal(radiusToDiameter(0.025), 0.05);
    assert.equal(diameterToRadius(0), 0);
    assert.equal(radiusToDiameter(0), 0);
  });

  it("round-trips", () => {
    const d = 0.098;
    assert.equal(radiusToDiameter(diameterToRadius(d)), d);
  });

  it("rejects negative inputs", () => {
    assertValidation(() => diameterToRadius(-0.01), /diameter/i);
    assertValidation(() => radiusToDiameter(-0.01), /radius/i);
  });
});

describe("circleArea", () => {
  it("computes π r²", () => {
    assert.equal(circleArea(0), 0);
    assert.equal(circleArea(1), Math.PI);
    assert.ok(Math.abs(circleArea(0.0125) - Math.PI * 0.0125 ** 2) < 1e-15);
  });

  it("rejects negative radius", () => {
    assertValidation(() => circleArea(-1), /radius/i);
  });
});

describe("cylinderVolume", () => {
  it("computes π r² L", () => {
    assert.equal(cylinderVolume(1, 1), Math.PI);
    assert.equal(cylinderVolume(0, 10), 0);
    assert.equal(cylinderVolume(2, 0), 0);
    const expected = Math.PI * 0.0125 ** 2 * 0.4;
    assert.ok(Math.abs(cylinderVolume(0.0125, 0.4) - expected) < 1e-15);
  });

  it("rejects negative radius or length", () => {
    assertValidation(() => cylinderVolume(-1, 1), /radius/i);
    assertValidation(() => cylinderVolume(1, -1), /length/i);
  });
});

describe("finPlanformArea", () => {
  it("uses trapezoid formula ½ (root + tip) × span", () => {
    // root=0.06, tip=0.03, span=0.04 → 0.5 * 0.09 * 0.04 = 0.0018
    assert.equal(finPlanformArea(0.06, 0.03, 0.04), 0.0018);
  });

  it("handles triangular fin (tip = 0) and zero area cases", () => {
    assert.equal(finPlanformArea(0.08, 0, 0.05), 0.002);
    assert.equal(finPlanformArea(0, 0, 0.1), 0);
    assert.equal(finPlanformArea(0.1, 0.05, 0), 0);
  });

  it("rejects negative chords or span", () => {
    assertValidation(() => finPlanformArea(-0.01, 0.02, 0.03), /rootChord/i);
    assertValidation(() => finPlanformArea(0.01, -0.02, 0.03), /tipChord/i);
    assertValidation(() => finPlanformArea(0.01, 0.02, -0.03), /span/i);
  });
});
