import { useMemo, useState, type CSSProperties } from "react";
import { Button } from "../../shared/ui/Button";
import { Card } from "../../shared/ui/Card";
import {
  burnDuration,
  parseThrustCsv,
  peakThrust,
  trapezoidalImpulse,
  type ThrustSample,
} from "./parseThrustCsv";
import "./MotorLibraryPanel.css";

export type { ThrustSample };

export interface MotorLibraryPanelProps {
  /**
   * Called when the user applies the parsed curve (e.g. wire into design metadata
   * or a sim module). Orchestrator owns integration.
   */
  onApplyCurve?: (samples: ThrustSample[]) => void;
  /**
   * Optional hook when parse succeeds (live preview / external validation).
   * Receives the same samples the panel shows.
   */
  onImport?: (samples: ThrustSample[]) => void;
  /** Seed CSV text (defaults to a small demo curve). */
  initialCsv?: string;
  /** Card title override. */
  title?: string;
}

const DEFAULT_CSV = `# time [s], thrust [N]
t,n
0.00,0
0.05,12
0.15,22
0.40,20
0.80,16
1.10,8
1.20,0
`;

const textareaStyle: CSSProperties = {
  width: "100%",
  minHeight: 140,
  resize: "vertical",
  padding: "0.55rem 0.65rem",
  borderRadius: "var(--radius-sm)",
  border: "1px solid var(--border)",
  background: "var(--bg)",
  color: "var(--text)",
  fontFamily: "var(--mono)",
  fontSize: "0.82rem",
  lineHeight: 1.45,
};

const statBoxStyle: CSSProperties = {
  flex: "1 1 0",
  minWidth: 90,
  padding: "0.55rem 0.65rem",
  borderRadius: "var(--radius-sm)",
  border: "1px solid var(--border)",
  background: "var(--bg-hover)",
};

/**
 * Self-contained motor thrust-curve import panel.
 * Client-side CSV parse only — no PocketBase SDK.
 */
export function MotorLibraryPanel({
  onApplyCurve,
  onImport,
  initialCsv = DEFAULT_CSV,
  title = "Motor library",
}: MotorLibraryPanelProps) {
  const [csv, setCsv] = useState(initialCsv);
  const [appliedNote, setAppliedNote] = useState<string | null>(null);

  const parsed = useMemo(() => parseThrustCsv(csv), [csv]);

  const impulseNs = useMemo(
    () => trapezoidalImpulse(parsed.samples),
    [parsed.samples]
  );
  const peakN = useMemo(() => peakThrust(parsed.samples), [parsed.samples]);
  const durationS = useMemo(
    () => burnDuration(parsed.samples),
    [parsed.samples]
  );

  // Allow apply when we have a usable curve; row-level parse issues are shown but non-blocking.
  const canApply = parsed.samples.length >= 2;

  function handleParseNotify() {
    if (parsed.samples.length === 0) return;
    onImport?.(parsed.samples);
    setAppliedNote(
      `Parsed ${parsed.samples.length} samples · I ≈ ${formatImpulse(impulseNs)} N·s`
    );
  }

  function handleApply() {
    if (!canApply) return;
    onApplyCurve?.(parsed.samples);
    onImport?.(parsed.samples);
    setAppliedNote(
      `Applied ${parsed.samples.length} samples · I ≈ ${formatImpulse(impulseNs)} N·s`
    );
  }

  function handleClear() {
    setCsv("");
    setAppliedNote(null);
  }

  function handleLoadDemo() {
    setCsv(DEFAULT_CSV);
    setAppliedNote(null);
  }

  return (
    <Card
      title={title}
      action={
        <span className="motor-lib-badge" title="Client-side only">
          CSV
        </span>
      }
    >
      <div className="stack motor-lib" style={{ gap: "0.85rem" }}>
        <p style={{ margin: 0, fontSize: "0.88rem" }}>
          Paste a thrust curve as <code>t,n</code> (time [s], thrust [N]).
          Header row optional. Impulse uses trapezoidal integration.
        </p>

        <label className="stack" style={{ gap: "0.3rem" }}>
          <span className="faint" style={{ fontSize: "0.82rem" }}>
            Thrust CSV
          </span>
          <textarea
            className="motor-lib-textarea"
            value={csv}
            onChange={(e) => {
              setCsv(e.target.value);
              setAppliedNote(null);
            }}
            spellCheck={false}
            aria-label="Thrust curve CSV"
            placeholder={"t,n\n0,0\n0.5,20\n1.0,0"}
            style={textareaStyle}
          />
        </label>

        <div className="row" style={{ flexWrap: "wrap", gap: "0.5rem" }}>
          <div style={statBoxStyle}>
            <div className="faint" style={{ fontSize: "0.72rem" }}>
              Impulse (trapz)
            </div>
            <div className="motor-lib-stat-value accent">
              {formatImpulse(impulseNs)}
              <span className="faint" style={{ fontSize: "0.75rem", marginLeft: 4 }}>
                N·s
              </span>
            </div>
          </div>
          <div style={statBoxStyle}>
            <div className="faint" style={{ fontSize: "0.72rem" }}>
              Peak thrust
            </div>
            <div className="motor-lib-stat-value">
              {peakN.toFixed(2)}
              <span className="faint" style={{ fontSize: "0.75rem", marginLeft: 4 }}>
                N
              </span>
            </div>
          </div>
          <div style={statBoxStyle}>
            <div className="faint" style={{ fontSize: "0.72rem" }}>
              Duration
            </div>
            <div className="motor-lib-stat-value">
              {durationS.toFixed(3)}
              <span className="faint" style={{ fontSize: "0.75rem", marginLeft: 4 }}>
                s
              </span>
            </div>
          </div>
          <div style={statBoxStyle}>
            <div className="faint" style={{ fontSize: "0.72rem" }}>
              Samples
            </div>
            <div className="motor-lib-stat-value">{parsed.samples.length}</div>
          </div>
        </div>

        {parsed.samples.length >= 2 ? (
          <ThrustSparkline samples={parsed.samples} />
        ) : null}

        {parsed.errors.length > 0 ? (
          <ul className="motor-lib-msg motor-lib-msg--error" role="alert">
            {parsed.errors.slice(0, 6).map((e) => (
              <li key={e}>{e}</li>
            ))}
            {parsed.errors.length > 6 ? (
              <li>…and {parsed.errors.length - 6} more</li>
            ) : null}
          </ul>
        ) : null}

        {parsed.warnings.length > 0 ? (
          <ul className="motor-lib-msg motor-lib-msg--warn">
            {parsed.warnings.slice(0, 4).map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        ) : null}

        {appliedNote ? (
          <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--success)" }}>
            {appliedNote}
          </p>
        ) : null}

        <div className="row" style={{ flexWrap: "wrap", gap: "0.5rem" }}>
          <Button
            variant="primary"
            type="button"
            disabled={!canApply}
            onClick={handleApply}
            title={
              onApplyCurve
                ? "Apply curve via onApplyCurve"
                : "Apply (no onApplyCurve wired yet)"
            }
          >
            Apply curve
          </Button>
          <Button
            variant="secondary"
            type="button"
            disabled={parsed.samples.length === 0}
            onClick={handleParseNotify}
          >
            Preview parse
          </Button>
          <Button variant="ghost" type="button" onClick={handleLoadDemo}>
            Demo CSV
          </Button>
          <Button variant="ghost" type="button" onClick={handleClear}>
            Clear
          </Button>
        </div>

        {parsed.samples.length > 0 ? (
          <details className="motor-lib-details">
            <summary>Sample table ({parsed.samples.length})</summary>
            <div className="motor-lib-table-wrap">
              <table className="motor-lib-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>t [s]</th>
                    <th>n [N]</th>
                  </tr>
                </thead>
                <tbody>
                  {parsed.samples.slice(0, 40).map((s, i) => (
                    <tr key={`${s.t}-${i}`}>
                      <td>{i + 1}</td>
                      <td>{s.t}</td>
                      <td>{s.n}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {parsed.samples.length > 40 ? (
                <p className="faint" style={{ fontSize: "0.8rem", margin: "0.4rem 0 0" }}>
                  Showing first 40 of {parsed.samples.length}
                </p>
              ) : null}
            </div>
          </details>
        ) : null}
      </div>
    </Card>
  );
}

function formatImpulse(v: number): string {
  if (!Number.isFinite(v)) return "—";
  if (Math.abs(v) >= 100) return v.toFixed(1);
  if (Math.abs(v) >= 10) return v.toFixed(2);
  return v.toFixed(3);
}

function ThrustSparkline({ samples }: { samples: ThrustSample[] }) {
  const w = 480;
  const h = 96;
  const pad = 10;

  const { path, area, maxN, maxT } = useMemo(() => {
    let maxN = 1;
    let maxT = 1;
    for (const s of samples) {
      if (s.n > maxN) maxN = s.n;
      if (s.t > maxT) maxT = s.t;
    }
    const pts = samples.map((s) => {
      const x = pad + (s.t / maxT) * (w - pad * 2);
      const y = h - pad - (s.n / maxN) * (h - pad * 2);
      return { x, y };
    });
    const line = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
    const first = pts[0]!;
    const last = pts[pts.length - 1]!;
    const areaPath = `${line} L ${last.x.toFixed(1)} ${(h - pad).toFixed(1)} L ${first.x.toFixed(1)} ${(h - pad).toFixed(1)} Z`;
    return { path: line, area: areaPath, maxN, maxT };
  }, [samples]);

  return (
    <svg
      className="motor-lib-spark"
      viewBox={`0 0 ${w} ${h}`}
      width="100%"
      role="img"
      aria-label={`Thrust curve, peak ${maxN.toFixed(1)} N over ${maxT.toFixed(2)} s`}
    >
      <path d={area} fill="var(--accent-soft)" stroke="none" />
      <path d={path} fill="none" stroke="var(--accent)" strokeWidth="2" />
      <text x={pad} y={14} fill="var(--text-faint)" fontSize="10">
        {maxN.toFixed(1)} N
      </text>
      <text x={w - pad - 36} y={h - 4} fill="var(--text-faint)" fontSize="10">
        {maxT.toFixed(2)} s
      </text>
    </svg>
  );
}
