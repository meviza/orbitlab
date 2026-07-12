/**
 * Client-side thrust-curve CSV helpers.
 * Format: time (s) and thrust (N) columns — header optional.
 * Accepts comma, semicolon, or whitespace delimiters.
 */

export interface ThrustSample {
  /** Time since ignition [s] */
  t: number;
  /** Thrust [N] */
  n: number;
}

export interface ParseThrustCsvResult {
  samples: ThrustSample[];
  errors: string[];
  warnings: string[];
}

const HEADER_RE = /^(t|time|s|sec|seconds)$/i;
const THRUST_HEADER_RE = /^(n|thrust|force|f)$/i;

function splitLine(line: string): string[] {
  const trimmed = line.trim();
  if (!trimmed) return [];
  if (trimmed.includes(";")) {
    return trimmed.split(";").map((c) => c.trim());
  }
  if (trimmed.includes(",")) {
    return trimmed.split(",").map((c) => c.trim());
  }
  return trimmed.split(/\s+/).map((c) => c.trim());
}

function parseNumber(raw: string): number | null {
  if (!raw) return null;
  // Support decimal comma in the second field only when already split
  const normalized = raw.replace(/\s/g, "").replace(",", ".");
  const v = Number(normalized);
  return Number.isFinite(v) ? v : null;
}

/**
 * Parse a thrust curve table into sorted unique-ish samples.
 * Non-numeric / incomplete rows are skipped (reported in errors).
 */
export function parseThrustCsv(text: string): ParseThrustCsvResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const samples: ThrustSample[] = [];

  const lines = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith("#"));

  if (lines.length === 0) {
    return { samples: [], errors: ["Empty CSV — paste t,n rows."], warnings };
  }

  let start = 0;
  const firstCells = splitLine(lines[0]!);
  if (
    firstCells.length >= 2 &&
    HEADER_RE.test(firstCells[0]!) &&
    THRUST_HEADER_RE.test(firstCells[1]!)
  ) {
    start = 1;
  } else if (
    firstCells.length >= 2 &&
    parseNumber(firstCells[0]!) === null &&
    parseNumber(firstCells[1]!) === null
  ) {
    // Generic header row (e.g. "time,thrust")
    start = 1;
  }

  for (let i = start; i < lines.length; i++) {
    const lineNo = i + 1;
    const cells = splitLine(lines[i]!);
    if (cells.length < 2) {
      errors.push(`Line ${lineNo}: need two columns (t, n).`);
      continue;
    }
    const t = parseNumber(cells[0]!);
    const n = parseNumber(cells[1]!);
    if (t === null || n === null) {
      errors.push(`Line ${lineNo}: non-numeric values "${cells[0]}", "${cells[1]}".`);
      continue;
    }
    if (t < 0) {
      errors.push(`Line ${lineNo}: time must be ≥ 0 (got ${t}).`);
      continue;
    }
    samples.push({ t, n });
  }

  if (samples.length === 0) {
    errors.push("No valid samples parsed.");
    return { samples: [], errors, warnings };
  }

  samples.sort((a, b) => a.t - b.t);

  // Drop exact duplicate times (keep last)
  const deduped: ThrustSample[] = [];
  for (const s of samples) {
    const last = deduped[deduped.length - 1];
    if (last && last.t === s.t) {
      warnings.push(`Duplicate time t=${s.t} s — keeping last thrust.`);
      last.n = s.n;
    } else {
      deduped.push({ ...s });
    }
  }

  if (deduped.length < 2) {
    warnings.push("Only one sample — impulse needs ≥ 2 points for trapz.");
  }

  return { samples: deduped, errors, warnings };
}

/**
 * Total impulse via trapezoidal rule: I ≈ Σ (n_i + n_{i+1})/2 · Δt  [N·s]
 */
export function trapezoidalImpulse(samples: readonly ThrustSample[]): number {
  if (samples.length < 2) return 0;
  let impulse = 0;
  for (let i = 0; i < samples.length - 1; i++) {
    const a = samples[i]!;
    const b = samples[i + 1]!;
    const dt = b.t - a.t;
    if (dt <= 0) continue;
    impulse += ((a.n + b.n) / 2) * dt;
  }
  return impulse;
}

/** Peak thrust [N] */
export function peakThrust(samples: readonly ThrustSample[]): number {
  let max = 0;
  for (const s of samples) {
    if (s.n > max) max = s.n;
  }
  return max;
}

/** Burn duration from first to last sample [s] */
export function burnDuration(samples: readonly ThrustSample[]): number {
  if (samples.length === 0) return 0;
  return samples[samples.length - 1]!.t - samples[0]!.t;
}
