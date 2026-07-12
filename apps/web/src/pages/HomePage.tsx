import { useLocale } from "../app/providers";
import type { RouteId } from "../app/router";
import { AuthPanel } from "../features/auth/AuthPanel";
import { t } from "../shared/i18n/messages";
import { Button } from "../shared/ui/Button";
import { Card } from "../shared/ui/Card";

export function HomePage({ onNavigate }: { onNavigate: (r: RouteId) => void }) {
  const { locale } = useLocale();

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
    </div>
  );
}
