import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildReport } from "./build-report.js";

describe("buildReport", () => {
  it("renders exam-style markdown sections with latex and prose steps", () => {
    const out = buildReport({
      designTitle: "Demo Model A",
      runId: "run_1",
      designId: "design_1",
      status: "completed",
      moduleIds: ["mass-properties", "flight.toy-vertical"],
      createdAt: "2024-06-01T12:00:00.000Z",
      summary: { apogeeM: 42.5, maxVelocityMs: 28.1 },
      samples: [
        { t: 0, altitude: 0, velocity: 0 },
        { t: 0.1, altitude: 1.2, velocity: 12 },
      ],
      moduleResults: [
        {
          moduleId: "mass-properties",
          title: "Mass properties",
          steps: [
            {
              title: "Total mass",
              latex: "m = \\sum_i m_i",
              prose: "Sum component masses to obtain vehicle mass.",
            },
          ],
        },
        {
          moduleId: "flight.toy-vertical",
          steps: [
            {
              title: "Newton II",
              latex: "m a = T - m g - D",
              prose: "1D vertical force balance.",
            },
            {
              title: "Result",
              prose: "Apogee reached at 42.5 m.",
            },
          ],
        },
      ],
    });

    assert.match(out.markdown, /# OrbitLab Report — Demo Model A/);
    assert.match(out.markdown, /## Summary metrics/);
    assert.match(out.markdown, /\| apogeeM \| 42\.5000 \|/);
    assert.match(out.markdown, /### Mass properties/);
    assert.match(out.markdown, /#### Step 1: Total mass/);
    assert.match(out.markdown, /\$\$m = \\sum_i m_i\$\$/);
    assert.match(out.markdown, /Sum component masses/);
    assert.match(out.markdown, /### flight\.toy-vertical/);
    assert.match(out.markdown, /#### Step 2: Result/);
    assert.match(out.markdown, /report engine/);

    assert.equal(
      out.csv,
      "t,altitude,velocity\n0,0,0\n0.1,1.2,12"
    );

    assert.ok(out.htmlPreview);
    assert.match(out.htmlPreview!, /OrbitLab Report — Demo Model A/);
    assert.match(out.htmlPreview!, /Mass properties/);
    assert.match(out.htmlPreview!, /m = \\sum_i m_i/);
  });

  it("omits calculation steps when includeFullSteps is false", () => {
    const out = buildReport({
      designTitle: "Short",
      includeFullSteps: false,
      summary: { apogeeM: 10 },
      moduleResults: [
        {
          moduleId: "m1",
          steps: [{ title: "A", prose: "should not appear" }],
        },
      ],
    });

    assert.doesNotMatch(out.markdown, /## Calculation steps/);
    assert.doesNotMatch(out.markdown, /should not appear/);
    assert.doesNotMatch(out.htmlPreview ?? "", /Calculation steps/);
  });

  it("falls back to summary CSV when samples are empty", () => {
    const out = buildReport({
      designTitle: "No series",
      runId: "r",
      designId: "d",
      status: "completed",
      summary: { apogeeM: 5, maxVelocityMs: 2 },
    });

    assert.equal(
      out.csv,
      "runId,designId,status,apogeeM,maxVelocityMs\nr,d,completed,5,2"
    );
  });

  it("escapes HTML in preview", () => {
    const out = buildReport({
      designTitle: `<script>alert(1)</script>`,
      moduleResults: [
        {
          moduleId: "x",
          steps: [
            {
              title: "T",
              prose: "a < b & c",
            },
          ],
        },
      ],
    });

    assert.ok(out.htmlPreview);
    assert.doesNotMatch(out.htmlPreview!, /<script>/);
    assert.match(out.htmlPreview!, /&lt;script&gt;/);
    assert.match(out.htmlPreview!, /a &lt; b &amp; c/);
  });
});
