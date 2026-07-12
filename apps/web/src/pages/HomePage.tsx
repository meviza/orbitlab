import { useContainer, useLocale } from "../app/providers";
import type { RouteId } from "../app/router";
import { AuthPanel } from "../features/auth/AuthPanel";
import { t } from "../shared/i18n/messages";
import { Button } from "../shared/ui/Button";
import { Card } from "../shared/ui/Card";

export function HomePage({ onNavigate }: { onNavigate: (r: RouteId) => void }) {
  const { locale } = useLocale();
  const { backend, pbUrl, modeLabel } = useContainer();

  const features = [
    t(locale, "homeF1"),
    t(locale, "homeF2"),
    t(locale, "homeF3"),
  ];

  return (
    <div className="stack" style={{ gap: "1.25rem" }}>
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "1.4fr 0.8fr",
          gap: "1rem",
          alignItems: "stretch",
        }}
        className="home-hero"
      >
        <style>{`
          @media (max-width: 800px) {
            .home-hero { grid-template-columns: 1fr !important; }
          }
        `}</style>

        <Card
          bodyStyle={{
            padding: "1.75rem",
            background:
              "linear-gradient(135deg, rgba(34,211,238,0.06), transparent 55%), var(--bg-panel)",
          }}
        >
          <p
            className="copper"
            style={{
              margin: "0 0 0.5rem",
              fontSize: "0.8rem",
              fontWeight: 600,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            {t(locale, "tagline")}
          </p>
          <h1 style={{ fontSize: "clamp(1.6rem, 3vw, 2.2rem)", marginBottom: "0.75rem" }}>
            {t(locale, "homeTitle")}
          </h1>
          <p style={{ maxWidth: 52 * 8, marginBottom: "1.25rem" }}>
            {t(locale, "homePitch")}
          </p>
          <div className="row" style={{ flexWrap: "wrap" }}>
            <Button variant="primary" onClick={() => onNavigate("editor")}>
              {t(locale, "homeCta")}
            </Button>
            <Button variant="secondary" onClick={() => onNavigate("sim")}>
              {t(locale, "homeCtaSim")}
            </Button>
          </div>
        </Card>

        <AuthPanel />
      </section>

      <Card title={t(locale, "homeFeaturesTitle")}>
        <ul
          style={{
            margin: 0,
            paddingLeft: "1.15rem",
            color: "var(--text-muted)",
          }}
        >
          {features.map((f) => (
            <li key={f} style={{ marginBottom: "0.45rem" }}>
              {f}
            </li>
          ))}
        </ul>
      </Card>

      <Card title={t(locale, "backendTitle")}>
        <p style={{ margin: "0 0 0.5rem", fontSize: "0.9rem" }}>
          {t(locale, "backendActive")}:{" "}
          <strong style={{ fontFamily: "var(--mono)" }}>{modeLabel}</strong>
          {backend === "pocketbase" && pbUrl ? (
            <span className="faint"> · {pbUrl}</span>
          ) : null}
        </p>
        <p
          style={{
            margin: 0,
            fontSize: "0.88rem",
            color: "var(--text-muted)",
            lineHeight: 1.55,
          }}
        >
          {t(locale, "backendHowTo")}
        </p>
        <pre
          style={{
            margin: "0.75rem 0 0",
            padding: "0.75rem 0.9rem",
            background: "var(--bg)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-sm)",
            fontFamily: "var(--mono)",
            fontSize: "0.78rem",
            color: "var(--text-muted)",
            overflowX: "auto",
          }}
        >{`# apps/web/.env
VITE_DATA_BACKEND=memory          # default — offline demo
# VITE_DATA_BACKEND=pocketbase
# VITE_POCKETBASE_URL=http://127.0.0.1:8090`}</pre>
      </Card>
    </div>
  );
}
