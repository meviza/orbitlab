import type { CSSProperties, ReactNode } from "react";

export type StatusBannerVariant = "info" | "error" | "loading" | "warning";

export interface StatusBannerProps {
  variant?: StatusBannerVariant;
  title?: string;
  message?: string;
  children?: ReactNode;
}

const palette: Record<
  StatusBannerVariant,
  { border: string; bg: string; accent: string }
> = {
  info: {
    border: "rgba(34, 211, 238, 0.35)",
    bg: "rgba(34, 211, 238, 0.08)",
    accent: "var(--accent)",
  },
  error: {
    border: "rgba(248, 113, 113, 0.45)",
    bg: "rgba(248, 113, 113, 0.1)",
    accent: "var(--danger)",
  },
  loading: {
    border: "rgba(148, 163, 184, 0.35)",
    bg: "rgba(148, 163, 184, 0.08)",
    accent: "var(--text-muted)",
  },
  warning: {
    border: "rgba(251, 191, 36, 0.45)",
    bg: "rgba(251, 191, 36, 0.1)",
    accent: "var(--warning)",
  },
};

export function StatusBanner({
  variant = "info",
  title,
  message,
  children,
}: StatusBannerProps) {
  const colors = palette[variant];

  const style: CSSProperties = {
    border: `1px solid ${colors.border}`,
    background: colors.bg,
    borderRadius: "var(--radius-md)",
    padding: "1rem 1.15rem",
    color: "var(--text)",
    maxWidth: 560,
    margin: "2.5rem auto",
  };

  return (
    <div role={variant === "error" ? "alert" : "status"} style={style}>
      {title ? (
        <div
          style={{
            fontWeight: 600,
            marginBottom: message || children ? "0.4rem" : 0,
            color: colors.accent,
          }}
        >
          {title}
        </div>
      ) : null}
      {message ? (
        <p
          style={{
            margin: 0,
            fontSize: "0.9rem",
            color: "var(--text-muted)",
            whiteSpace: "pre-wrap",
          }}
        >
          {message}
        </p>
      ) : null}
      {children}
    </div>
  );
}
