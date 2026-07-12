import {
  Suspense,
  lazy,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
} from "react";
import type { DesignDto } from "@orbitlab/application";
import { useContainer, useLocale } from "../../app/providers";
import { MotorLibraryPanel, type ThrustSample } from "../motor-library";
import { WireframeToggle } from "../viewport-3d/WireframeToggle";
import { t } from "../../shared/i18n/messages";
import { Button } from "../../shared/ui/Button";
import { Card } from "../../shared/ui/Card";

const RocketViewport = lazy(() =>
  import("../viewport-3d/RocketViewport").then((m) => ({
    default: m.RocketViewport,
  }))
);

const ACTIVE_DESIGN_KEY = "orbitlab.activeDesignId";
const ACTIVE_DESIGN_META_KEY = "orbitlab.activeDesign";

const CATALOG = [
  { id: "nose-cone", type: "nose", label: "Nose cone" },
  { id: "body-tube", type: "body", label: "Body tube" },
  { id: "fins", type: "fin", label: "Fins" },
  { id: "motor-mount", type: "motor", label: "Motor mount" },
  { id: "parachute", type: "recovery", label: "Parachute" },
  { id: "transition", type: "other", label: "Transition" },
] as const;

const DEFAULT_COMPONENT_IDS = [
  "nose-cone",
  "body-tube",
  "fins",
  "motor-mount",
  "parachute",
] as const;

function catalogById(id: string) {
  return CATALOG.find((c) => c.id === id);
}

function numMeta(
  metadata: Readonly<Record<string, unknown>>,
  key: string,
  fallback: number
): number {
  const v = metadata[key];
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

export interface DesignEditorPanelProps {
  onSaved?: (design: DesignDto) => void;
}

export function DesignEditorPanel({ onSaved }: DesignEditorPanelProps) {
  const { saveDesign, listDesigns, modeLabel } = useContainer();
  const { locale } = useLocale();

  const [title, setTitle] = useState("Demo Model A");
  const [componentIds, setComponentIds] = useState<string[]>([
    ...DEFAULT_COMPONENT_IDS,
  ]);
  const [massKg, setMassKg] = useState(0.45);
  const [thrustN, setThrustN] = useState(18);
  const [burnTimeS, setBurnTimeS] = useState(1.2);
  const [cd, setCd] = useState(0.5);
  const [areaM2, setAreaM2] = useState(0.01);
  const [designId, setDesignId] = useState<string | undefined>("demo_model_a");
  const [designs, setDesigns] = useState<DesignDto[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [wireframe, setWireframe] = useState(false);
  const [thrustCurve, setThrustCurve] = useState<ThrustSample[] | null>(null);

  const applyDesign = useCallback((d: DesignDto) => {
    setDesignId(d.id);
    setTitle(d.title);
    setComponentIds(d.components.map((c) => c.id));
    setMassKg(numMeta(d.metadata, "massKg", 0.45));
    setThrustN(numMeta(d.metadata, "thrustN", 18));
    setBurnTimeS(numMeta(d.metadata, "burnTimeS", 1.2));
    setCd(numMeta(d.metadata, "cd", 0.5));
    setAreaM2(numMeta(d.metadata, "areaM2", 0.01));
    setStatus(null);
    setError(null);
    sessionStorage.setItem(ACTIVE_DESIGN_KEY, d.id);
  }, []);

  const refresh = useCallback(async (): Promise<DesignDto[]> => {
    const result = await listDesigns.execute();
    if (result.ok) {
      const list = [...result.value];
      setDesigns(list);
      return list;
    }
    setError(result.error.message);
    return [];
  }, [listDesigns]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const list = await refresh();
      if (cancelled || hydrated) return;

      const stored = sessionStorage.getItem(ACTIVE_DESIGN_KEY);
      if (stored) {
        const match = list.find((d) => d.id === stored);
        if (match) {
          applyDesign(match);
          setHydrated(true);
          return;
        }
      }

      // Keep seed defaults when memory seed is present
      const seed = list.find((d) => d.id === "demo_model_a");
      if (seed && designId === "demo_model_a") {
        applyDesign(seed);
      }
      setHydrated(true);
    })();
    return () => {
      cancelled = true;
    };
    // Initial hydrate only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refresh]);

  function toggleComponent(id: string) {
    setComponentIds((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  }

  function moveComponent(id: string, direction: -1 | 1) {
    setComponentIds((prev) => {
      const idx = prev.indexOf(id);
      if (idx < 0) return prev;
      const next = idx + direction;
      if (next < 0 || next >= prev.length) return prev;
      const copy = [...prev];
      const tmp = copy[idx]!;
      copy[idx] = copy[next]!;
      copy[next] = tmp;
      return copy;
    });
  }

  function loadDesign(d: DesignDto) {
    applyDesign(d);
  }

  function handleNewDesign() {
    setDesignId(undefined);
    setTitle("Untitled");
    setComponentIds([...DEFAULT_COMPONENT_IDS]);
    setMassKg(0.45);
    setThrustN(18);
    setBurnTimeS(1.2);
    setCd(0.5);
    setAreaM2(0.01);
    setStatus(null);
    setError(null);
    sessionStorage.removeItem(ACTIVE_DESIGN_KEY);
    sessionStorage.removeItem(ACTIVE_DESIGN_META_KEY);
  }

  async function handleSave() {
    setError(null);

    // Preserve stack order from componentIds (not catalog order)
    const components = componentIds
      .map((id) => catalogById(id))
      .filter((c): c is (typeof CATALOG)[number] => c != null)
      .map((c) => ({
        id: c.id,
        type: c.type,
        name: c.label,
        params: {},
      }));

    const result = await saveDesign.execute({
      id: designId,
      title,
      components,
      metadata: {
        massKg,
        thrustN,
        burnTimeS,
        cd,
        areaM2,
        ...(thrustCurve && thrustCurve.length > 0
          ? { thrustCurve }
          : {}),
      },
    });

    if (!result.ok) {
      setError(result.error.message);
      return;
    }

    const saved = result.value;
    setDesignId(saved.id);
    setStatus(
      `${t(locale, "editorSaved")} · ${t(locale, "editorDesignId")}: ${saved.id}`
    );
    onSaved?.(saved);

    // Refresh list (important in pocketbase mode) and keep selection
    await refresh();
    setDesignId(saved.id);

    sessionStorage.setItem(ACTIVE_DESIGN_KEY, saved.id);
    sessionStorage.setItem(
      ACTIVE_DESIGN_META_KEY,
      JSON.stringify({
        id: saved.id,
        title: saved.title,
        massKg,
        thrustN,
        burnTimeS,
        cd,
        areaM2,
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

  const iconBtnStyle: CSSProperties = {
    padding: "0.15rem 0.4rem",
    minWidth: "1.6rem",
    fontSize: "0.75rem",
    lineHeight: 1.2,
  };

  const viewportComponents = useMemo(
    () =>
      componentIds
        .map((id) => catalogById(id))
        .filter((c): c is (typeof CATALOG)[number] => c != null)
        .map((c) => ({
          id: c.id,
          type: c.type,
          name: c.label,
        })),
    [componentIds]
  );

  return (
    <div className="editor-grid">

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

        {componentIds.length > 0 && (
          <div style={{ marginTop: "1rem" }}>
            <div
              style={{
                fontSize: "0.78rem",
                color: "var(--text-faint)",
                marginBottom: "0.4rem",
              }}
            >
              {t(locale, "editorSelectedOrder")}
            </div>
            <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {componentIds.map((id, index) => {
                const item = catalogById(id);
                const label = item?.label ?? id;
                return (
                  <li
                    key={id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.35rem",
                      marginBottom: "0.3rem",
                      padding: "0.3rem 0.4rem",
                      borderRadius: "var(--radius-sm)",
                      border: "1px solid var(--border)",
                      background: "var(--bg)",
                      fontSize: "0.82rem",
                    }}
                  >
                    <span
                      style={{
                        flex: 1,
                        minWidth: 0,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {index + 1}. {label}
                    </span>
                    <Button
                      variant="ghost"
                      type="button"
                      style={iconBtnStyle}
                      disabled={index === 0}
                      aria-label={t(locale, "editorMoveUp")}
                      title={t(locale, "editorMoveUp")}
                      onClick={() => moveComponent(id, -1)}
                    >
                      ↑
                    </Button>
                    <Button
                      variant="ghost"
                      type="button"
                      style={iconBtnStyle}
                      disabled={index === componentIds.length - 1}
                      aria-label={t(locale, "editorMoveDown")}
                      title={t(locale, "editorMoveDown")}
                      onClick={() => moveComponent(id, 1)}
                    >
                      ↓
                    </Button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        <div style={{ marginTop: "1rem" }}>
          <div
            style={{
              fontSize: "0.78rem",
              color: "var(--text-faint)",
              marginBottom: "0.4rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "0.5rem",
            }}
          >
            <span>{t(locale, "designs")}</span>
            <Button
              variant="ghost"
              type="button"
              style={{ padding: "0.2rem 0.45rem", fontSize: "0.78rem" }}
              onClick={handleNewDesign}
            >
              {t(locale, "editorNew")}
            </Button>
          </div>
          {designs.length === 0 ? (
            <p className="faint" style={{ fontSize: "0.85rem", margin: 0 }}>
              {t(locale, "noDesigns")}
            </p>
          ) : (
            <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {designs.map((d) => {
                const active = d.id === designId;
                return (
                  <li key={d.id} style={{ marginBottom: "0.3rem" }}>
                    <Button
                      variant="ghost"
                      style={{
                        width: "100%",
                        justifyContent: "flex-start",
                        padding: "0.3rem 0.4rem",
                        fontWeight: active ? 600 : 500,
                        border: active
                          ? "1px solid rgba(34, 211, 238, 0.35)"
                          : "1px solid transparent",
                        background: active
                          ? "var(--accent-soft)"
                          : "transparent",
                        color: active ? "var(--accent)" : undefined,
                      }}
                      onClick={() => loadDesign(d)}
                    >
                      {t(locale, "loadDesign")}: {d.title}
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </Card>

      <Card
        title={t(locale, "editorViewport")}
        bodyStyle={{
          display: "flex",
          flexDirection: "column",
          minHeight: 360,
          padding: "0.5rem",
          background: "var(--bg)",
        }}
      >
        <div
          id="rocket-viewport-slot"
          style={{
            width: "100%",
            flex: 1,
            minHeight: 360,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div style={{ marginBottom: "0.5rem" }}>
            <WireframeToggle checked={wireframe} onChange={setWireframe} />
          </div>
          <Suspense
            fallback={
              <div
                style={{
                  flex: 1,
                  minHeight: 360,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--text-faint)",
                  fontSize: "0.85rem",
                  background: "#0b0f14",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--border)",
                }}
              >
                Loading 3D viewport…
              </div>
            }
          >
            <RocketViewport
              components={viewportComponents}
              wireframe={wireframe}
              style={{ flex: 1, minHeight: 360 }}
            />
          </Suspense>
        </div>
      </Card>

      <Card
        title={t(locale, "editorProps")}
        action={
          <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
            <Button variant="ghost" type="button" onClick={handleNewDesign}>
              {t(locale, "editorNew")}
            </Button>
            <Button
              variant="primary"
              type="button"
              onClick={() => void handleSave()}
            >
              {t(locale, "editorSave")}
            </Button>
          </div>
        }
      >
        <div className="stack">
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "0.4rem",
              alignItems: "center",
              marginBottom: "0.25rem",
            }}
          >
            <span
              style={{
                fontFamily: "var(--mono)",
                fontSize: "0.7rem",
                letterSpacing: "0.04em",
                padding: "0.2rem 0.45rem",
                borderRadius: "999px",
                border: "1px solid var(--border-strong)",
                background: "var(--accent-soft)",
                color: "var(--accent)",
              }}
              title={t(locale, "editorBackendMode")}
            >
              {modeLabel}
            </span>
            <span
              style={{
                fontFamily: "var(--mono)",
                fontSize: "0.72rem",
                color: "var(--text-faint)",
                wordBreak: "break-all",
              }}
            >
              {designId
                ? `${t(locale, "editorDesignId")}: ${designId}`
                : t(locale, "editorUnsaved")}
            </span>
          </div>

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
          <label>
            <span style={labelStyle}>{t(locale, "editorCd")}</span>
            <input
              style={fieldStyle}
              type="number"
              step="0.01"
              min="0"
              value={cd}
              onChange={(e) => setCd(Number(e.target.value))}
            />
          </label>
          <label>
            <span style={labelStyle}>{t(locale, "editorArea")}</span>
            <input
              style={fieldStyle}
              type="number"
              step="0.001"
              min="0.0001"
              value={areaM2}
              onChange={(e) => setAreaM2(Number(e.target.value))}
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

      <div style={{ gridColumn: "1 / -1" }}>
        <MotorLibraryPanel
          onApplyCurve={(samples) => {
            setThrustCurve(samples);
            if (samples.length >= 2) {
              const peak = Math.max(...samples.map((s) => s.n));
              const burn = samples[samples.length - 1]!.t - samples[0]!.t;
              if (peak > 0) setThrustN(peak);
              if (burn > 0) setBurnTimeS(burn);
            }
            setStatus(
              `Motor curve applied (${samples.length} samples). Save design to persist.`
            );
          }}
        />
      </div>
    </div>
  );
}
