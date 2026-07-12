import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { SimRunResultDto } from "../dto/sim-run-dto.js";
import { ExportReportUseCase, extractModuleResults } from "./export-report.js";

function sampleRun(
  extras?: Partial<SimRunResultDto>
): SimRunResultDto {
  return {
    id: "run_1",
    designId: "design_1",
    moduleIds: ["mass-properties"],
    status: "completed",
    summary: { apogeeM: 10, maxVelocityMs: 5, flightTimeS: 2 },
    createdAt: "2024-06-01T12:00:00.000Z",
    samples: [
      { t: 0, altitude: 0, velocity: 0 },
      { t: 1, altitude: 10, velocity: 0 },
    ],
    ...extras,
  };
}

describe("ExportReportUseCase", () => {
  it("rejects missing run", async () => {
    const uc = new ExportReportUseCase();
    const result = await uc.execute({
      run: { id: "" } as SimRunResultDto,
    });
    assert.equal(result.ok, false);
  });

  it("includes equation steps from moduleOutputs envelopes", async () => {
    const uc = new ExportReportUseCase();
    const result = await uc.execute({
      designTitle: "Demo",
      includeFullSteps: true,
      run: sampleRun({
        moduleOutputs: {
          "mass-properties": {
            data: { totalMassKg: 0.45 },
            steps: [
              {
                title: "Total mass",
                latex: "m = \\sum_i m_i",
                prose: "Sum component masses.",
              },
            ],
          },
        },
      }),
    });

    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.match(result.value.markdown, /Total mass/);
    assert.match(result.value.markdown, /Sum component masses/);
    assert.match(result.value.csv, /^t,altitude,velocity/);
    assert.ok(result.value.htmlPreview);
  });

  it("handles legacy moduleOutputs (data only)", async () => {
    const uc = new ExportReportUseCase();
    const result = await uc.execute({
      designTitle: "Legacy",
      run: sampleRun({
        moduleOutputs: {
          "mass-properties": { totalMassKg: 0.5 },
        },
      }),
    });

    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.match(result.value.markdown, /mass-properties/);
    assert.match(result.value.markdown, /totalMassKg/);
  });
});

describe("extractModuleResults", () => {
  it("parses steps envelopes and legacy blobs", () => {
    const parsed = extractModuleResults({
      withSteps: {
        data: { x: 1 },
        steps: [{ title: "A", prose: "B", latex: "c" }],
      },
      legacy: { foo: 2 },
    });

    assert.equal(parsed.length, 2);
    const withSteps = parsed.find((m) => m.moduleId === "withSteps");
    const legacy = parsed.find((m) => m.moduleId === "legacy");
    assert.equal(withSteps?.steps.length, 1);
    assert.equal(withSteps?.steps[0]?.title, "A");
    assert.equal(legacy?.steps.length, 0);
    assert.deepEqual(legacy?.data, { foo: 2 });
  });
});
