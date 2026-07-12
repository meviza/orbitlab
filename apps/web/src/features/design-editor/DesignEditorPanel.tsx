import { useCallback, useEffect, useState, type CSSProperties } from "react";
import type { DesignDto } from "@orbitlab/application";
import { useContainer, useLocale } from "../../app/providers";
import { t } from "../../shared/i18n/messages";
import { Button } from "../../shared/ui/Button";
import { Card } from "../../shared/ui/Card";

const CATALOG = [
  { id: "nose-cone", type: "nose", label: "Nose cone" },
  { id: "body-tube", type: "body", label: "Body tube" },
  { id: "fins", type: "fin", label: "Fins" },
  { id: "motor-mount", type: "motor", label: "Motor mount" },
  { id: "parachute", type: "recovery", label: "Parachute" },
  { id: "transition", type: "other", label: "Transition" },
] as const;

export interface DesignEditorPanelProps {
  onSaved?: (design: DesignDto) => void;
}

export function DesignEditorPanel({ onSaved }: DesignEditorPanelProps) {
  const { saveDesign, listDesigns } = useContainer();
  const { locale } = useLocale();

  const [title, setTitle] = useState("Demo Model A");
  const [componentIds, setComponentIds] = useState<string[]>([
    "nose-cone",
    "body-tube",
    "fins",
    "motor-mount",
    "parachute",
  ]);
  const [massKg, setMassKg] = useState(0.45);
  const [thrustN, setThrustN] = useState(18);
  const [burnTimeS, setBurnTimeS] = useState(1.2);
  const [designId, setDesignId] = useState<string | undefined>("demo_model_a");
  const [designs, setDesigns] = useState<DesignDto[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const result = await listDesigns.execute();
    if (result.ok) {
      setDesigns([...result.value]);
    } else {
      setError(result.error.message);
    }
  }, [listDesigns]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  function toggleComponent(id: string) {
    setComponentIds((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  }

  function loadDesign(d: DesignDto) {
    setDesignId(d.id);
    setTitle(d.title);
    setComponentIds(d.components.map((c) => c.id));
    setMassKg(typeof d.metadata.massKg === "number" ? d.metadata.massKg : 0.45);
    setThrustN(
      typeof d.metadata.thrustN === "number" ? d.metadata.thrustN : 18
    );
    setBurnTimeS(
      typeof d.metadata.burnTimeS === "number" ? d.metadata.burnTimeS : 1.2
    );
    setStatus(null);
    setError(null);
    sessionStorage.setItem(
      "orbitlab.activeDesignId",
      d.id
    );
  }

  async function handleSave() {
    setError(null);
    const components = CATALOG.filter((c) => componentIds.includes(c.id)).map(
      (c) => ({
        id: c.id,
        type: c.type,
        name: c.label,
        params: {},
      })
    );

    const result = await saveDesign.execute({
      id: designId,
      title,
      components,
      metadata: {
        massKg,
        thrustN,
        burnTimeS,
        cd: 0.5,
        areaM2: 0.01,
      },
    });

    if (!result.ok) {
      setError(result.error.message);
      return;
    }

    const saved = result.value;
    setDesignId(saved.id);
    setStatus(t(locale, "editorSaved"));
    onSaved?.(saved);
    await refresh();
    sessionStorage.setItem("orbitlab.activeDesignId", saved.id);
    sessionStorage.setItem(
      "orbitlab.activeDesign",
      JSON.stringify({
        id: saved.id,
        title: saved.title,
        massKg,
        thrustN,
        burnTimeS,
      })
    );
  }

  const fieldStyle: CSSProperties = {
    width: "100%",
    padding: "0.45rem 0.6rem",
    borderRadius: "var(--radius-sm)",
    border: "1px solid var(--border-strong)",
    background: "var(--bg)",
    outline: "none",
  };

  const labelStyle: CSSProperties = {
    display: "block",
    fontSize: "0.78rem",
    color: "var(--text-muted)",
    marginBottom: "0.25rem",
  };

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "220px 1fr 260px",
        gap: "0.85rem",
        minHeight: 420,
      }}
      className="editor-grid"
    >
      <style>{`
        @media (max-width: 900px) {
          .editor-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>

      <Card title={t(locale, "editorComponents")}>
        <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
          {CATALOG.map((item) => {
            const on = componentIds.includes(item.id);
            return (
              <li key={item.id} style={{ marginBottom: "0.35rem" }}>
                <button
                  type="button"
                  onClick={() => toggleComponent(item.id)}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    padding: "0.45rem 0.55rem",
                    borderRadius: "var(--radius-sm)",
                    border: on
                      ? "1px solid rgba(34, 211, 238, 0.35)"
                      : "1px solid var(--border)",
                    background: on ? "var(--accent-soft)" : "var(--bg)",
                    color: on ? "var(--accent)" : "var(--text-muted)",
                    cursor: "pointer",
                    fontSize: "0.88rem",
                  }}
                >
                  {on ? "● " : "○ "}
                  {item.label}
                </button>
              </li>
            );
          })}
        </ul>

        <div style={{ marginTop: "1rem" }}>
          <div
            style={{
              fontSize: "0.78rem",
              color: "var(--text-faint)",
              marginBottom: "0.4rem",
            }}
          >
            {t(locale, "designs")}
          </div>
          {designs.length === 0 ? (
            <p className="faint" style={{ fontSize: "0.85rem", margin: 0 }}>
              {t(locale, "noDesigns")}
            </p>
          ) : (
            <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {designs.map((d) => (
                <li key={d.id} style={{ marginBottom: "0.3rem" }}>
                  <Button
                    variant="ghost"
                    style={{
                      width: "100%",
                      justifyContent: "flex-start",
                      padding: "0.3rem 0.4rem",
                      fontWeight: 500,
                    }}
                    onClick={() => loadDesign(d)}
                  >
                    {t(locale, "loadDesign")}: {d.title}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>

      <Card
        title="Viewport"
        bodyStyle={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: 360,
          background:
            "repeating-linear-gradient(0deg, transparent, transparent 23px, rgba(36,48,65,0.5) 24px), repeating-linear-gradient(90deg, transparent, transparent 23px, rgba(36,48,65,0.5) 24px), var(--bg)",
        }}
      >
        <div
          style={{
            textAlign: "center",
            padding: "1.5rem",
            border: "1px dashed var(--border-strong)",
            borderRadius: "var(--radius-md)",
            background: "rgba(11, 15, 20, 0.75)",
            maxWidth: 280,
          }}
        >
          <div
            style={{
              fontSize: "2rem",
              marginBottom: "0.5rem",
              color: "var(--accent)",
            }}
          >
            ⧉
          </div>
          <div style={{ fontWeight: 600, marginBottom: "0.35rem" }}>
            {t(locale, "editorViewport")}
          </div>
          <p style={{ margin: 0, fontSize: "0.85rem" }}>
            Components: {componentIds.length}
          </p>
        </div>
      </Card>

      <Card
        title={t(locale, "editorProps")}
        action={
          <Button variant="primary" onClick={() => void handleSave()}>
            {t(locale, "editorSave")}
          </Button>
        }
      >
        <div className="stack">
          <label>
            <span style={labelStyle}>{t(locale, "editorTitleLabel")}</span>
            <input
              style={fieldStyle}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>
          <label>
            <span style={labelStyle}>{t(locale, "editorMass")}</span>
            <input
              style={fieldStyle}
              type="number"
              step="0.01"
              min="0.01"
              value={massKg}
              onChange={(e) => setMassKg(Number(e.target.value))}
            />
          </label>
          <label>
            <span style={labelStyle}>{t(locale, "editorThrust")}</span>
            <input
              style={fieldStyle}
              type="number"
              step="0.1"
              min="0"
              value={thrustN}
              onChange={(e) => setThrustN(Number(e.target.value))}
            />
          </label>
          <label>
            <span style={labelStyle}>{t(locale, "editorBurn")}</span>
            <input
              style={fieldStyle}
              type="number"
              step="0.1"
              min="0"
              value={burnTimeS}
              onChange={(e) => setBurnTimeS(Number(e.target.value))}
            />
          </label>

          {status && (
            <div style={{ color: "var(--success)", fontSize: "0.88rem" }}>
              {status}
            </div>
          )}
          {error && (
            <div style={{ color: "var(--danger)", fontSize: "0.88rem" }}>
              {error}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
