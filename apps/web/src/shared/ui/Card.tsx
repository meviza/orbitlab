import type { CSSProperties, ReactNode } from "react";

export interface CardProps {
  title?: string;
  children: ReactNode;
  style?: CSSProperties;
  bodyStyle?: CSSProperties;
  action?: ReactNode;
}

export function Card({ title, children, style, bodyStyle, action }: CardProps) {
  return (
    <section
      style={{
        background: "var(--bg-panel)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-md)",
        boxShadow: "var(--shadow)",
        overflow: "hidden",
        ...style,
      }}
    >
      {(title || action) && (
        <header
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "0.75rem",
            padding: "0.7rem 1rem",
            borderBottom: "1px solid var(--border)",
            background: "var(--bg-elevated)",
          }}
        >
          {title ? (
            <h3 style={{ margin: 0, fontSize: "0.95rem" }}>{title}</h3>
          ) : (
            <span />
          )}
          {action}
        </header>
      )}
      <div style={{ padding: "1rem", ...bodyStyle }}>{children}</div>
    </section>
  );
}
