import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  extractAltitudeSeries,
  sparklineAscii,
  sparklineInline,
  sparklineMarkdownSection,
} from "./sparkline.js";

/** Monotonic rising altitude mock (toy ascent). */
function monoAltitude(n = 20, apogee = 100): number[] {
  return Array.from({ length: n }, (_, i) => (apogee * i) / (n - 1));
}

describe("sparklineAscii", () => {
  it("returns empty string for empty input", () => {
    assert.equal(sparklineAscii([]), "");
  });

  it("renders default 40×8 grid for monotonic altitude", () => {
    const values = monoAltitude(16, 80);
    const art = sparklineAscii(values);
    const rows = art.split("\n");
    assert.equal(rows.length, 8, "default height is 8 rows");
    for (const row of rows) {
      assert.equal(row.length, 40, "default width is 40 cols");
    }
    // Monotonic rising → left side emptier, right side fuller
    const top = rows[0]!;
    const bottom = rows[rows.length - 1]!;
    const leftFilled = (top.slice(0, 8).match(/█/g) ?? []).length;
    const rightFilled = (top.slice(-8).match(/█/g) ?? []).length;
    assert.ok(
      rightFilled >= leftFilled,
      "rising series should fill more on the right at the top row"
    );
    assert.ok(
      (bottom.match(/█/g) ?? []).length >
        (top.match(/█/g) ?? []).length,
      "bottom row should have more filled cells than top for rising series"
    );
  });

  it("respects custom width and height", () => {
    const art = sparklineAscii(monoAltitude(10), 12, 4);
    const rows = art.split("\n");
    assert.equal(rows.length, 4);
    assert.ok(rows.every((r) => r.length === 12));
  });

  it("draws a baseline for constant series", () => {
    const art = sparklineAscii([5, 5, 5, 5], 10, 4);
    assert.ok(art.includes("█"), "constant series still shows blocks");
    assert.equal(art.split("\n").length, 4);
  });

  it("treats non-finite values as zero", () => {
    const art = sparklineAscii([0, Number.NaN, 10, Number.POSITIVE_INFINITY], 8, 4);
    assert.equal(art.split("\n").length, 4);
    assert.ok(art.includes("█"));
  });
});

describe("sparklineInline", () => {
  it("uses unicode block levels for monotonic altitude", () => {
    const s = sparklineInline(monoAltitude(12, 50), 12);
    assert.equal(s.length, 12);
    // First should be lower block than last for rising series
    const blocks = " ▁▂▃▄▅▆▇█";
    assert.ok(blocks.includes(s[0]!));
    assert.ok(blocks.includes(s[s.length - 1]!));
    assert.ok(
      blocks.indexOf(s[s.length - 1]!) >= blocks.indexOf(s[0]!),
      "inline sparkline should not decrease overall for mono rise"
    );
  });
});

describe("extractAltitudeSeries", () => {
  it("passes through number arrays", () => {
    assert.deepEqual(extractAltitudeSeries([0, 1, 2]), [0, 1, 2]);
  });

  it("reads altitude from sample records", () => {
    const samples = [
      { t: 0, altitude: 0, velocity: 0 },
      { t: 0.5, altitude: 12.5, velocity: 20 },
      { t: 1, altitude: 40, velocity: 5 },
    ];
    assert.deepEqual(extractAltitudeSeries(samples), [0, 12.5, 40]);
  });

  it("falls back to alt/h/y keys", () => {
    assert.deepEqual(extractAltitudeSeries([{ alt: 3 }]), [3]);
    assert.deepEqual(extractAltitudeSeries([{ h: 7 }]), [7]);
    assert.deepEqual(extractAltitudeSeries([{ y: 9 }]), [9]);
  });
});

describe("sparklineMarkdownSection", () => {
  it("builds markdown appendix for monotonic altitude samples", () => {
    const samples = monoAltitude(20, 100).map((altitude, i) => ({
      t: i * 0.1,
      altitude,
      velocity: 10 - i * 0.3,
    }));
    const md = sparklineMarkdownSection("Altitude profile", samples);

    assert.match(md, /^## Altitude profile/m);
    assert.match(md, /20 samples/);
    assert.match(md, /min \*\*0\*\* m/);
    assert.match(md, /max \*\*100\*\* m/);
    assert.match(md, /```/);
    assert.ok(md.includes("█"), "fenced chart uses full block");
    assert.match(md, /Inline: `/);

    // Chart body has 8 lines of width 40 inside the fence
    const fence = md.match(/```\n([\s\S]*?)\n```/);
    assert.ok(fence, "has fenced code block");
    const chartRows = fence![1]!.split("\n");
    assert.equal(chartRows.length, 8);
    assert.ok(chartRows.every((r) => r.length === 40));
  });

  it("accepts raw number series as altitude", () => {
    const md = sparklineMarkdownSection("Climb", monoAltitude(8, 40));
    assert.match(md, /## Climb/);
    assert.ok(md.includes("█"));
  });

  it("handles empty samples gracefully", () => {
    const md = sparklineMarkdownSection("Empty", []);
    assert.match(md, /## Empty/);
    assert.match(md, /No altitude samples/);
  });
});
