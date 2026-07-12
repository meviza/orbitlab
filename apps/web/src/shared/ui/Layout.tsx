import type { ReactNode } from "react";
import { useContainer } from "../../app/providers";
import type { RouteId } from "../../app/router";
import type { Locale } from "../i18n/messages";
import { t } from "../i18n/messages";
import { Button } from "./Button";

export interface LayoutProps {
  route: RouteId;
  locale: Locale;
  onNavigate: (route: RouteId) => void;
  onToggleLocale: () => void;
  children: ReactNode;
}

const navItems: { id: RouteId; key: "navHome" | "navEditor" | "navSim" }[] = [
  { id: "home", key: "navHome" },
  { id: "editor", key: "navEditor" },
  { id: "sim", key: "navSim" },
];

export function Layout({
  route,
  locale,
  onNavigate,
  onToggleLocale,
  children,
}: LayoutProps) {
  const { modeLabel, backend } = useContainer();
  const isPb = backend === "pocketbase";

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <header
        style={{
          height: "var(--header-h)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 1.25rem",
          borderBottom: "1px solid var(--border)",
          background: "rgba(11, 15, 20, 0.85)",
          backdropFilter: "blur(10px)",
          position: "sticky",
          top: 0,
          zIndex: 20,
        }}
      >
        <div className="row" style={{ gap: "1.25rem" }}>
          <button
            type="button"
            onClick={() => onNavigate("home")}
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: "0.5rem",
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 0,
            }}
          >
            <span
              style={{
                fontWeight: 700,
                fontSize: "1.15rem",
                letterSpacing: "-0.03em",
                color: "var(--text)",
              }}
            >
              {t(locale, "appName")}
            </span>
            <span
              className="faint"
              style={{ fontSize: "0.78rem", display: "none" }}
            >
              {t(locale, "tagline")}
            </span>
          </button>

          <nav className="row" style={{ gap: "0.25rem" }}>
            {navItems.map((item) => {
              const active = route === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onNavigate(item.id)}
                  style={{
                    background: active ? "var(--accent-soft)" : "transparent",
                    color: active ? "var(--accent)" : "var(--text-muted)",
                    border: active
                      ? "1px solid rgba(34, 211, 238, 0.25)"
                      : "1px solid transparent",
                    borderRadius: "var(--radius-sm)",
                    padding: "0.35rem 0.7rem",
                    fontSize: "0.88rem",
                    fontWeight: active ? 600 : 500,
                    cursor: "pointer",
                  }}
                >
                  {t(locale, item.key)}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="row" style={{ gap: "0.65rem" }}>
          <span
            title={
              isPb
                ? "Data backend: PocketBase (VITE_DATA_BACKEND=pocketbase)"
                : "Data backend: in-memory (default)"
            }
            style={{
              fontFamily: "var(--mono)",
              fontSize: "0.68rem",
              fontWeight: 600,
              letterSpacing: "0.06em",
              padding: "0.28rem 0.55rem",
              borderRadius: "999px",
              border: isPb
                ? "1px solid rgba(201, 123, 74, 0.45)"
                : "1px solid rgba(34, 211, 238, 0.35)",
              color: isPb ? "var(--copper)" : "var(--accent)",
              background: isPb
                ? "var(--copper-soft)"
                : "var(--accent-soft)",
              userSelect: "none",
            }}
          >
            {modeLabel}
          </span>
          <Button variant="secondary" onClick={onToggleLocale}>
            {t(locale, "langToggle")}
          </Button>
        </div>
      </header>

      <main
        style={{
          flex: 1,
          width: "100%",
          maxWidth: "var(--max-w)",
          margin: "0 auto",
          padding: "1.25rem",
        }}
      >
        {children}
      </main>

      <footer
        style={{
          padding: "0.85rem 1.25rem",
          borderTop: "1px solid var(--border)",
          color: "var(--text-faint)",
          fontSize: "0.8rem",
          textAlign: "center",
        }}
      >
        OrbitLab · Apache-2.0 · Clean Architecture presentation layer
      </footer>
    </div>
  );
}
