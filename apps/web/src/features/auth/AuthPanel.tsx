import { useLocale } from "../../app/providers";
import { t } from "../../shared/i18n/messages";
import { Card } from "../../shared/ui/Card";

/** Offline guest shell — PocketBase auth will inject via ports later. */
export function AuthPanel() {
  const { locale } = useLocale();

  return (
    <Card title={t(locale, "authGuest")}>
      <p style={{ margin: 0, fontSize: "0.88rem" }}>{t(locale, "authNote")}</p>
      <div
        className="row"
        style={{
          marginTop: "0.75rem",
          padding: "0.55rem 0.75rem",
          background: "var(--bg-hover)",
          borderRadius: "var(--radius-sm)",
          border: "1px solid var(--border)",
        }}
      >
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: "var(--success)",
            display: "inline-block",
          }}
        />
        <span style={{ fontSize: "0.88rem" }}>local · free plan</span>
      </div>
    </Card>
  );
}
