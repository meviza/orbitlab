import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  err,
  flatMapResult,
  isErr,
  isOk,
  mapResult,
  ok,
} from "./result.js";

describe("Result helpers", () => {
  it("ok wraps a success value", () => {
    const result = ok(42);
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.value, 42);
    }
  });

  it("err wraps a failure", () => {
    const result = err("boom");
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.error, "boom");
    }
  });

  it("isOk / isErr narrow correctly", () => {
    const success = ok("yes");
    const failure = err(new Error("no"));

    assert.equal(isOk(success), true);
    assert.equal(isErr(success), false);
    assert.equal(isOk(failure), false);
    assert.equal(isErr(failure), true);

    if (isOk(success)) {
      assert.equal(success.value, "yes");
    }
    if (isErr(failure)) {
      assert.equal(failure.error.message, "no");
    }
  });

  it("mapResult maps success and preserves error", () => {
    assert.deepEqual(
      mapResult(ok(2), (n) => n * 3),
      ok(6)
    );
    assert.deepEqual(
      mapResult(err("fail"), (n: number) => n * 3),
      err("fail")
    );
  });

  it("flatMapResult chains Results", () => {
    const doubleIfPositive = (n: number) =>
      n > 0 ? ok(n * 2) : err("non-positive");

    assert.deepEqual(flatMapResult(ok(5), doubleIfPositive), ok(10));
    assert.deepEqual(
      flatMapResult(ok(0), doubleIfPositive),
      err("non-positive")
    );
    assert.deepEqual(
      flatMapResult(err("upstream"), doubleIfPositive),
      err("upstream")
    );
  });
});
