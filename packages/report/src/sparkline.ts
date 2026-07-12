/**
 * ASCII / Unicode-block sparklines for OrbitLab report markdown.
 * Pure functions — no React, no I/O. Orchestrator may append sections
 * via optional hook (`build-report-sparklines.ts`) without editing build-report.
 */

/** Vertical block levels (empty → full). Classic 8-level bar set. */
const BLOCKS = [" ", "▁", "▂", "▃", "▄", "▅", "▆", "▇", "█"] as const;

/** Full block used for multi-row area charts. */
const FULL = "█";
const EMPTY = " ";

/**
 * Render a multi-line Unicode-block sparkline of `values`.
 *
 * - Resamples to exactly `width` columns (linear).
 * - Scales min→max into `height` rows of solid blocks.
 * - Constant series draws a mid-height baseline so empty data is visible.
 * - Empty input returns an empty string.
 */
export function sparklineAscii(
  values: readonly number[],
  width = 40,
  height = 8
): string {
  const w = Math.max(1, Math.floor(width));
  const h = Math.max(1, Math.floor(height));

  if (values.length === 0) return "";

  const finite = values.map((v) =>
    typeof v === "number" && Number.isFinite(v) ? v : 0
  );
  const series = resample(finite, w);

  let min = Infinity;
  let max = -Infinity;
  for (const v of series) {
    if (v < min) min = v;
    if (v > max) max = v;
  }

  const flat = max - min < Number.EPSILON;
  // Map each column to a continuous level in [0, h]
  const levels = series.map((v) => {
    if (flat) return h / 2;
    return ((v - min) / (max - min)) * h;
  });

  const rows: string[] = [];
  for (let row = h - 1; row >= 0; row--) {
    let line = "";
    for (let col = 0; col < w; col++) {
      const level = levels[col]!;
      // Fill cell if the series reaches above this row's floor
      line += level > row ? FULL : EMPTY;
    }
    rows.push(line);
  }
  return rows.join("\n");
}

/**
 * Compact single-line sparkline (▁▂▃▄▅▆▇█). Useful in tables / inline.
 * Not the primary API but exported for reuse.
 */
export function sparklineInline(values: readonly number[], width = 24): string {
  if (values.length === 0) return "";
  const w = Math.max(1, Math.floor(width));
  const finite = values.map((v) =>
    typeof v === "number" && Number.isFinite(v) ? v : 0
  );
  const series = resample(finite, w);
  let min = Infinity;
  let max = -Infinity;
  for (const v of series) {
    if (v < min) min = v;
    if (v > max) max = v;
  }
  const span = max - min;
  return series
    .map((v) => {
      if (span < Number.EPSILON) return BLOCKS[4]!; // mid
      const t = (v - min) / span;
      const idx = Math.min(8, Math.max(0, Math.round(t * 8)));
      return BLOCKS[idx]!;
    })
    .join("");
}

/**
 * Markdown appendix section with a fenced ASCII altitude sparkline.
 *
 * @param title Section heading (without leading `#` markers)
 * @param samples Either raw altitude numbers, or sample rows with an
 *   `altitude` (or `alt`, `h`, `y`) field.
 */
export function sparklineMarkdownSection(
  title: string,
  samples:
    | readonly number[]
    | ReadonlyArray<Readonly<Record<string, number>>>
): string {
  const altitudes = extractAltitudeSeries(samples);
  const heading = title.trim() || "Altitude";
  const lines: string[] = [`## ${heading}`, ""];

  if (altitudes.length === 0) {
    lines.push("_No altitude samples for sparkline._", "");
    return lines.join("\n");
  }

  const chart = sparklineAscii(altitudes);
  const min = Math.min(...altitudes);
  const max = Math.max(...altitudes);
  lines.push(
    `Altitude series (${altitudes.length} samples): min **${fmt(min)}** m · max **${fmt(max)}** m`,
    "",
    "```",
    chart,
    "```",
    "",
    `Inline: \`${sparklineInline(altitudes)}\``,
    ""
  );
  return lines.join("\n");
}

/** Extract numeric altitude series from raw numbers or sample records. */
export function extractAltitudeSeries(
  samples:
    | readonly number[]
    | ReadonlyArray<Readonly<Record<string, number>>>
): number[] {
  if (samples.length === 0) return [];
  const first = samples[0];
  if (typeof first === "number") {
    return (samples as readonly number[]).map((v) =>
      Number.isFinite(v) ? v : 0
    );
  }
  const rows = samples as ReadonlyArray<Readonly<Record<string, number>>>;
  const keys = ["altitude", "alt", "h", "y"] as const;
  return rows.map((row) => {
    for (const k of keys) {
      const v = row[k];
      if (typeof v === "number" && Number.isFinite(v)) return v;
    }
    return 0;
  });
}

/** Linear resample to exactly `n` points (first and last preserved). */
function resample(values: readonly number[], n: number): number[] {
  if (n <= 0) return [];
  if (values.length === 0) return Array.from({ length: n }, () => 0);
  if (values.length === 1) return Array.from({ length: n }, () => values[0]!);
  if (values.length === n) return values.slice();

  const out: number[] = new Array(n);
  const last = values.length - 1;
  for (let i = 0; i < n; i++) {
    const t = (i / (n - 1)) * last;
    const i0 = Math.floor(t);
    const i1 = Math.min(last, i0 + 1);
    const frac = t - i0;
    out[i] = values[i0]! * (1 - frac) + values[i1]! * frac;
  }
  return out;
}

function fmt(v: number): string {
  if (!Number.isFinite(v)) return String(v);
  return Number.isInteger(v) ? String(v) : v.toFixed(2);
}
