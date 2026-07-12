import { ok, err, type Result } from "@orbitlab/domain";
import {
  buildReport,
  type ReportModuleResult,
  type ReportStep,
} from "@orbitlab/report";
import type { ExportReportCommand, ReportDto } from "../dto/report-dto.js";
import type { SimRunResultDto } from "../dto/sim-run-dto.js";
import { ApplicationError } from "../errors/application-error.js";

/**
 * Educational report exporter: Markdown + CSV (+ HTML preview) from a sim run.
 * Delegates formatting to `@orbitlab/report`; keeps use-case validation thin.
 */
export class ExportReportUseCase {
  async execute(
    command: ExportReportCommand
  ): Promise<Result<ReportDto, ApplicationError>> {
    try {
      const run = command.run;
      if (!run?.id) {
        return err(ApplicationError.validation("run is required"));
      }

      const title =
        command.designTitle?.trim() || `Simulation ${run.designId}`;
      const includeFullSteps = command.includeFullSteps ?? true;
      const moduleResults = extractModuleResults(run.moduleOutputs);

      const built = buildReport({
        designTitle: title,
        runId: run.id,
        designId: run.designId,
        status: run.status,
        moduleIds: run.moduleIds,
        createdAt: run.createdAt,
        errorMessage: run.errorMessage,
        includeFullSteps,
        moduleResults,
        samples: run.samples,
        summary: run.summary,
      });

      const report: ReportDto = {
        runId: run.id,
        designId: run.designId,
        title,
        markdown: built.markdown,
        csv: built.csv,
        htmlPreview: built.htmlPreview,
        generatedAt: new Date().toISOString(),
      };

      return ok(report);
    } catch (e) {
      return err(ApplicationError.fromUnknown(e));
    }
  }
}

/**
 * Accept moduleOutputs in either legacy shape (`data` only) or
 * `{ data, steps }` from LocalSimulationRunner / pipeline ModuleResult.
 */
export function extractModuleResults(
  moduleOutputs: SimRunResultDto["moduleOutputs"]
): ReportModuleResult[] {
  if (!moduleOutputs) return [];

  const results: ReportModuleResult[] = [];

  for (const [moduleId, raw] of Object.entries(moduleOutputs)) {
    if (isModuleEnvelope(raw)) {
      results.push({
        moduleId,
        steps: normalizeSteps(raw.steps),
        data: raw.data,
      });
      continue;
    }

    // Legacy: value is the module data blob with no steps.
    results.push({
      moduleId,
      steps: [],
      data: raw,
    });
  }

  return results;
}

function isModuleEnvelope(
  value: unknown
): value is { data?: unknown; steps?: unknown } {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    ("steps" in value || "data" in value) &&
    // Prefer envelope when `steps` is present (even if empty array).
    ("steps" in value
      ? Array.isArray((value as { steps: unknown }).steps)
      : Object.keys(value as object).every((k) => k === "data" || k === "steps"))
  );
}

function normalizeSteps(steps: unknown): ReportStep[] {
  if (!Array.isArray(steps)) return [];
  const out: ReportStep[] = [];
  for (const s of steps) {
    if (typeof s !== "object" || s === null) continue;
    const rec = s as Record<string, unknown>;
    const title = typeof rec.title === "string" ? rec.title : "Step";
    const prose = typeof rec.prose === "string" ? rec.prose : "";
    const latex = typeof rec.latex === "string" ? rec.latex : undefined;
    out.push({ title, prose, latex });
  }
  return out;
}
