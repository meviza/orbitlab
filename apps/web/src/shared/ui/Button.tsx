import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "copper";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  children: ReactNode;
}

const styles: Record<Variant, React.CSSProperties> = {
  primary: {
    background: "linear-gradient(180deg, #22d3ee 0%, #0891b2 100%)",
    color: "#041016",
    border: "1px solid transparent",
  },
  secondary: {
    background: "var(--bg-hover)",
    color: "var(--text)",
    border: "1px solid var(--border-strong)",
  },
  ghost: {
    background: "transparent",
    color: "var(--text-muted)",
    border: "1px solid transparent",
  },
  copper: {
    background: "var(--copper-soft)",
    color: "var(--copper)",
    border: "1px solid rgba(201, 123, 74, 0.35)",
  },
};

export function Button({
  variant = "primary",
  children,
  style,
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "0.4rem",
        padding: "0.5rem 0.95rem",
        borderRadius: "var(--radius-sm)",
        fontWeight: 600,
        fontSize: "0.9rem",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.55 : 1,
        transition: "transform 0.12s ease, opacity 0.12s ease",
        ...styles[variant],
        ...style,
      }}
      {...rest}
    >
      {children}
    </button>
  );
}
