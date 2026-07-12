import { useEffect, useMemo, useState } from "react";
import type { DesignDto } from "@orbitlab/application";
import { useContainer, useLocale } from "../../app/providers";
import { t } from "../../shared/i18n/messages";
import { Button } from "../../shared/ui/Button";
import { Card } from "../../shared/ui/Card";
import { useRunSimulation } from "./useRunSimulation";

function AltitudeChart({
  samples,
}: {
  samples: { t: number; altitude: number }[];
}) {
  const w = 560;
  const h = 220;
  const pad = 28;

  const { path, maxH, maxT } = useMemo(() => {
    if (samples.length === 0) {
      return { path: "", maxH: 1, maxT: 1 };
    }
    let maxH = 1;
    let maxT = 1;
    for (const s of samples) {
      if (s.altitude > maxH) maxH = s.altitude;
      if (s.t > maxT) maxT = s.t;
    }
    const pts = samples.map((s) => {
      const x = pad + (s.t / maxT) * (w - pad * 2);
      const y = h - pad - (s.altitude / maxH) * (h - pad * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });
    return { path: `M ${pts.join(" L ")}`, maxH, maxT };
  }, [samples]);

  if (samples.length === 0) return null;

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      width="100%"
      style={{
        display: "block",
        background: "var(--bg)",
        borderRadius: "var(--radius-sm)",
        border: "1px solid var(--border)",
      }}
      role="img"
      aria-label="Altitude vs time"
    >
      <line
        x1={pad}
        y1={h - pad}
        x2={w - pad}
        y2={h - pad}
        stroke="var(--border-strong)"
      />
      <line
        x1={pad}
        y1={pad}
        x2={pad}
        y2={h - pad}
        stroke="var(--border-strong)"
      />
      <path d={path} fill="none" stroke="var(--accent)" strokeWidth="2" />
      <text x={pad} y={16} fill="var(--text-faint)" fontSize="11">
        {maxH.toFixed(1)} m
      </text>
      <text x={w - pad - 40} y={h - 8} fill="var(--text-faint)" fontSize="11">
        {maxT.toFixed(1)} s
      </text>
    </svg>
  );
}

function sampleNumber(
  row: Readonly<Record<string, number>>,
  key: string
): number {
  const v = row[key];
  return typeof v === "number" ? v : 0;
}

export function SimRunnerPanel() {
  const { locale } = useLocale();
  const { listDesigns } = useContainer();
  const { result, loading, error, run } = useRunSimulation();
  const [designs, setDesigns] = useState<DesignDto[]>([]);
  const [designId, setDesignId] = useState<string>("demo_model_a");

  useEffect(() => {
    void (async () => {
      const listed = await listDesigns.execute();
      if (listed.ok) {
        setDesigns([...listed.value]);
        const stored = sessionStorage.getItem("orbitlab.activeDesignId");
        if (stored && listed.value.some((d) => d.id === stored)) {
          setDesignId(stored);
        } else if (listed.value[0]) {
          setDesignId(listed.value[0].id);
        }
      }
    })();
  }, [listDesigns]);

  const active = designs.find((d) => d.id === designId) ?? designs[0];

  async function handleRun() {
    if (!designId) return;
    await run(designId);
  }

  const chartSamples = useMemo(() => {
    if (!result?.samples) return [];
    return result.samples.map((s) => ({
      t: sampleNumber(s, "t"),
      altitude: sampleNumber(s, "altitude"),
    }));
  }, [result]);

  const listSamples = useMemo(() => {
    if (!result?.samples?.length) return [];
    const samples = result.samples;
    const step = Math.max(1, Math.floor(samples.length / 24));
    return samples.filter(
      (_, i) => i % step === 0 || i === samples.length - 1
    );
  }, [result]);

  return (
    <div className="stack" style={{ gap: "1rem" }}>
      <Card
        title={t(locale, "simTitle")}
        action={
          <Button
            variant="copper"
            disabled={loading || !designId}
            onClick={() => void handleRun()}
          >
            {loading ? t(locale, "simRunning") : t(locale, "simRun")}
          </Button>
        }
      >
        <label className="stack" style={{ gap: "0.35rem", maxWidth: 360 }}>
          <span className="muted" style={{ fontSize: "0.78rem" }}>
            Design
          </span>
          <select
            value={designId}
            onChange={(e) => {
              setDesignId(e.target.value);
              sessionStorage.setItem("orbitlab.activeDesignId", e.target.value);
            }}
            style={{
              padding: "0.45rem 0.6rem",
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--border-strong)",
              background: "var(--bg)",
            }}
          >
            {designs.map((d) => (
              <option key={d.id} value={d.id}>
                {d.title}
              </option>
            ))}
          </select>
        </label>
        {active && (
          <p style={{ marginTop: "0.75rem", marginBottom: 0, fontSize: "0.88rem" }}>
            mass{" "}
            <span className="accent">
              {String(active.metadata.massKg ?? "—")}
            </span>{" "}
            kg · thrust{" "}
            <span className="accent">
              {String(active.metadata.thrustN ?? "—")}
            </span>{" "}
            N · burn{" "}
            <span className="accent">
              {String(active.metadata.burnTimeS ?? "—")}
            </span>{" "}
            s
          </p>
        )}
        {error && (
          <p style={{ color: "var(--danger)", marginTop: "0.75rem" }}>
            {error}
          </p>
        )}
      </Card>

      {result ? (
        <>
          <div
            className="grid-2"
            style={{ gridTemplateColumns: "repeat(3, 1fr)" }}
          >
            <Card>
              <div className="faint" style={{ fontSize: "0.78rem" }}>
                {t(locale, "simApogee")}
              </div>
              <div style={{ fontSize: "1.35rem", fontWeight: 700 }}>
                {(result.summary.apogeeM ?? 0).toFixed(1)}{" "}
                <span
                  style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}
                >
                  m
                </span>
              </div>
            </Card>
            <Card>
              <div className="faint" style={{ fontSize: "0.78rem" }}>
                {t(locale, "simMaxV")}
              </div>
              <div style={{ fontSize: "1.35rem", fontWeight: 700 }}>
                {(result.summary.maxVelocityMs ?? 0).toFixed(1)}{" "}
                <span
                  style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}
                >
                  m/s
                </span>
              </div>
            </Card>
            <Card>
              <div className="faint" style={{ fontSize: "0.78rem" }}>
                {t(locale, "simFlightTime")}
              </div>
              <div style={{ fontSize: "1.35rem", fontWeight: 700 }}>
                {(result.summary.flightTimeS ?? 0).toFixed(2)}{" "}
                <span
                  style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}
                >
                  s
                </span>
              </div>
            </Card>
          </div>

          <Card title={t(locale, "simChart")}>
            <AltitudeChart samples={chartSamples} />
          </Card>

          <Card title={t(locale, "simSamples")}>
            <div
              style={{
                maxHeight: 220,
                overflow: "auto",
                fontFamily: "var(--mono)",
                fontSize: "0.8rem",
              }}
            >
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ color: "var(--text-faint)", textAlign: "left" }}>
                    <th style={{ padding: "0.25rem" }}>t (s)</th>
                    <th style={{ padding: "0.25rem" }}>h (m)</th>
                    <th style={{ padding: "0.25rem" }}>v (m/s)</th>
                  </tr>
                </thead>
                <tbody>
                  {listSamples.map((s, i) => (
                    <tr
                      key={`${sampleNumber(s, "t")}-${i}`}
                      style={{ borderTop: "1px solid var(--border)" }}
                    >
                      <td style={{ padding: "0.25rem" }}>
                        {sampleNumber(s, "t").toFixed(2)}
                      </td>
                      <td style={{ padding: "0.25rem" }}>
                        {sampleNumber(s, "altitude").toFixed(2)}
                      </td>
                      <td style={{ padding: "0.25rem" }}>
                        {sampleNumber(s, "velocity").toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      ) : (
        <Card>
          <p style={{ margin: 0 }}>{t(locale, "simEmpty")}</p>
        </Card>
      )}
    </div>
  );
}
