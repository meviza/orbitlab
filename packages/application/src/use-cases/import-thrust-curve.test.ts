import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ImportThrustCurveUseCase,
  parseThrustCurveCsv,
  trapezoidalImpulseNs,
} from "./import-thrust-curve.js";

describe("parseThrustCurveCsv", () => {
  it("parses bare t,n rows", () => {
    const result = parseThrustCurveCsv("0,0\n1,10\n2,0\n");
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.deepEqual(result.value, [
      { t: 0, n: 0 },
      { t: 1, n: 10 },
      { t: 2, n: 0 },
    ]);
  });

  it("skips t,n header", () => {
    const result = parseThrustCurveCsv("t,n\n0,5\n0.5,20\n1,0\n");
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.value.length, 3);
    assert.equal(result.value[0]?.t, 0);
    assert.equal(result.value[1]?.n, 20);
  });

  it("skips time,thrust header (case-insensitive)", () => {
    const result = parseThrustCurveCsv("Time,Thrust\n0,0\n1,12\n");
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.value.length, 2);
  });

  it("accepts tab and semicolon separators", () => {
    const tab = parseThrustCurveCsv("0\t0\n1\t10");
    const semi = parseThrustCurveCsv("0;0\n1;10");
    assert.equal(tab.ok, true);
    assert.equal(semi.ok, true);
  });

  it("rejects fewer than 2 samples", () => {
    const result = parseThrustCurveCsv("t,n\n0,1\n");
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.error.code, "VALIDATION");
  });

  it("rejects non-increasing time", () => {
    const result = parseThrustCurveCsv("0,1\n1,2\n1,3\n");
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.error.code, "VALIDATION");
    assert.match(result.error.message, /increasing/i);
  });

  it("rejects negative thrust", () => {
    const result = parseThrustCurveCsv("0,1\n1,-0.1\n");
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.error.code, "VALIDATION");
    assert.match(result.error.message, /non-negative/i);
  });

  it("rejects non-numeric cells", () => {
    const result = parseThrustCurveCsv("0,1\nx,2\n");
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.error.code, "VALIDATION");
  });

  it("ignores blank lines and # comments", () => {
    const result = parseThrustCurveCsv("# motor\n\n0,0\n\n1,10\n");
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.value.length, 2);
  });
});

describe("trapezoidalImpulseNs", () => {
  it("integrates a triangle (0→peak→0) exactly", () => {
    // Triangle height 10 N over [0,2]: area = 10
    const impulse = trapezoidalImpulseNs([
      { t: 0, n: 0 },
      { t: 1, n: 10 },
      { t: 2, n: 0 },
    ]);
    assert.ok(Math.abs(impulse - 10) < 1e-12);
  });

  it("integrates a constant thrust plateau", () => {
    // 5 N from t=0 to t=2 → impulse 10
    const impulse = trapezoidalImpulseNs([
      { t: 0, n: 5 },
      { t: 2, n: 5 },
    ]);
    assert.equal(impulse, 10);
  });
});

describe("ImportThrustCurveUseCase", () => {
  it("returns samples, impulse, burn time, and peak thrust", async () => {
    const uc = new ImportThrustCurveUseCase();
    const csv = ["t,n", "0,0", "0.5,20", "1.0,20", "1.5,0"].join("\n");

    const result = await uc.execute({
      csvText: csv,
      designTitle: "  Demo Motor  ",
    });

    assert.equal(result.ok, true);
    if (!result.ok) return;

    assert.equal(result.value.samples.length, 4);
    assert.equal(result.value.burnTimeS, 1.5);
    assert.equal(result.value.peakThrustN, 20);
    assert.equal(result.value.designTitle, "Demo Motor");
    // trapz: (0+20)/2*0.5 + (20+20)/2*0.5 + (20+0)/2*0.5 = 5 + 10 + 5 = 20
    assert.ok(Math.abs(result.value.impulseNs - 20) < 1e-12);
  });

  it("rejects empty csvText with VALIDATION", async () => {
    const uc = new ImportThrustCurveUseCase();
    const result = await uc.execute({ csvText: "   " });
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.error.code, "VALIDATION");
  });

  it("rejects bad CSV with VALIDATION (no ports / fakes)", async () => {
    const uc = new ImportThrustCurveUseCase();
    const result = await uc.execute({
      csvText: "time,thrust\n0,1\n0,2\n",
    });
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.error.code, "VALIDATION");
  });

  it("omits designTitle when not provided", async () => {
    const uc = new ImportThrustCurveUseCase();
    const result = await uc.execute({
      csvText: "0,10\n1,10\n",
    });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.value.designTitle, undefined);
    assert.equal(result.value.impulseNs, 10);
    assert.equal(result.value.peakThrustN, 10);
    assert.equal(result.value.burnTimeS, 1);
  });
});
