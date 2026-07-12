export function ModuleChipBar({
  moduleIds,
  title,
}: {
  moduleIds: readonly string[];
  title?: string;
}) {
  return (
    <div className="stack" style={{ gap: "0.4rem" }}>
      {title ? (
        <span className="muted" style={{ fontSize: "0.78rem" }}>
          {title}
        </span>
      ) : null}
      <div className="chip-row" aria-live="polite">
        {moduleIds.map((id) => (
          <span key={id} className="chip">
            {id}
          </span>
        ))}
      </div>
    </div>
  );
}
