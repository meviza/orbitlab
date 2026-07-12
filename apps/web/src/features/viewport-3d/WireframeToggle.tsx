import { useId } from "react";
import "./wireframe-toggle.css";

export interface WireframeToggleProps {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
}

/**
 * Controlled dark segmented toggle for 3D solid vs wireframe render mode.
 * Parent owns state and wires `checked` → RocketViewport `wireframe`.
 */
export function WireframeToggle({
  checked,
  onChange,
  label = "Render mode",
}: WireframeToggleProps) {
  const labelId = useId();
  const showLabel = Boolean(label);

  return (
    <div className="wireframe-toggle">
      {showLabel ? (
        <span className="wireframe-toggle__label" id={labelId}>
          {label}
        </span>
      ) : null}
      <div
        className="wireframe-toggle__group"
        role="group"
        aria-labelledby={showLabel ? labelId : undefined}
        aria-label={showLabel ? undefined : "Render mode"}
      >
        <button
          type="button"
          className="wireframe-toggle__btn"
          aria-pressed={!checked}
          onClick={() => onChange(false)}
        >
          Solid
        </button>
        <button
          type="button"
          className="wireframe-toggle__btn"
          aria-pressed={checked}
          onClick={() => onChange(true)}
        >
          Wireframe
        </button>
      </div>
    </div>
  );
}
