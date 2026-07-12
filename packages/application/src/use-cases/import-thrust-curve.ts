import { ok, err, type Result } from "@orbitlab/domain";
import type {
  ImportThrustCurveCommand,
  ThrustCurveDto,
  ThrustSampleDto,
} from "../dto/thrust-curve-dto.js";
import { ApplicationError } from "../errors/application-error.js";

/**
 * Import a motor thrust curve from CSV text.
 * Pure application logic — no ports, no persistence.
 */
export class ImportThrustCurveUseCase {
  async execute(
    command: ImportThrustCurveCommand
  ): Promise<Result<ThrustCurveDto, ApplicationError>> {
    try {
      const csvText = command.csvText;
      if (typeof csvText !== "string" || !csvText.trim()) {
        return err(
          ApplicationError.validation("csvText is required and must be non-empty")
        );
      }

      const parsed = parseThrustCurveCsv(csvText);
      if (!parsed.ok) {
        return err(parsed.error);
      }

      const samples = parsed.value;
      const impulseNs = trapezoidalImpulseNs(samples);
      const burnTimeS = samples[samples.length - 1]!.t - samples[0]!.t;
      const peakThrustN = samples.reduce(
        (max, s) => (s.n > max ? s.n : max),
        samples[0]!.n
      );

      const title = command.designTitle?.trim();
      const dto: ThrustCurveDto = {
        samples,
        impulseNs,
        burnTimeS,
        peakThrustN,
        ...(title ? { designTitle: title } : {}),
      };

      return ok(dto);
    } catch (e) {
      return err(ApplicationError.fromUnknown(e));
    }
  }
}

/**
 * Parse CSV thrust table into validated samples.
 * Accepts headers `t,n` / `time,thrust` (case-insensitive) or bare numeric rows.
 * Exported for unit tests.
 */
export function parseThrustCurveCsv(
  csvText: string
): Result<ThrustSampleDto[], ApplicationError> {
  const lines = csvText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith("#"));

  if (lines.length === 0) {
    return err(ApplicationError.validation("CSV has no data rows"));
  }

  let startIndex = 0;
  if (isHeaderLine(lines[0]!)) {
    startIndex = 1;
  }

  const dataLines = lines.slice(startIndex);
  if (dataLines.length < 2) {
    return err(
      ApplicationError.validation("Thrust curve requires at least 2 samples", {
        rowCount: dataLines.length,
      })
    );
  }

  const samples: ThrustSampleDto[] = [];

  for (let i = 0; i < dataLines.length; i++) {
    const line = dataLines[i]!;
    const rowNumber = startIndex + i + 1; // 1-based in original text (approx)
    const parts = line.split(/[,;\t]/).map((p) => p.trim());
    if (parts.length < 2) {
      return err(
        ApplicationError.validation(
          `Row ${rowNumber}: expected two columns (time, thrust)`,
          { line, rowNumber }
        )
      );
    }

    const t = Number(parts[0]);
    const n = Number(parts[1]);

    if (!Number.isFinite(t) || !Number.isFinite(n)) {
      return err(
        ApplicationError.validation(
          `Row ${rowNumber}: time and thrust must be finite numbers`,
          { line, rowNumber, t: parts[0], n: parts[1] }
        )
      );
    }

    if (n < 0) {
      return err(
        ApplicationError.validation(
          `Row ${rowNumber}: thrust must be non-negative`,
          { rowNumber, n }
        )
      );
    }

    if (samples.length > 0) {
      const prev = samples[samples.length - 1]!;
      if (!(t > prev.t)) {
        return err(
          ApplicationError.validation(
            `Row ${rowNumber}: time must be strictly increasing`,
            { rowNumber, t, previousT: prev.t }
          )
        );
      }
    }

    samples.push({ t, n });
  }

  if (samples.length < 2) {
    return err(
      ApplicationError.validation("Thrust curve requires at least 2 samples", {
        sampleCount: samples.length,
      })
    );
  }

  return ok(samples);
}

/**
 * Trapezoidal integral of thrust over time: ∑ (n_i + n_{i+1})/2 · Δt [N·s].
 * Exported for unit tests.
 */
export function trapezoidalImpulseNs(
  samples: readonly ThrustSampleDto[]
): number {
  if (samples.length < 2) return 0;
  let sum = 0;
  for (let i = 0; i < samples.length - 1; i++) {
    const a = samples[i]!;
    const b = samples[i + 1]!;
    sum += ((a.n + b.n) / 2) * (b.t - a.t);
  }
  return sum;
}

function isHeaderLine(line: string): boolean {
  const first = line.split(/[,;\t]/)[0]?.trim().toLowerCase() ?? "";
  if (first === "t" || first === "time" || first === "time_s" || first === "times") {
    return true;
  }
  // Non-numeric first cell → treat as header
  const n = Number(first);
  return first.length > 0 && !Number.isFinite(n);
}
