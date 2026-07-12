import { useLocale } from "../app/providers";
import type { RouteId } from "../app/router";
import { DesignEditorPanel } from "../features/design-editor/DesignEditorPanel";
import { t } from "../shared/i18n/messages";
import { Button } from "../shared/ui/Button";

export function EditorPage({
  onNavigate,
}: {
  onNavigate: (r: RouteId) => void;
}) {
  const { locale } = useLocale();

  return (
    <div className="stack" style={{ gap: "1rem" }}>
      <div
        className="row"
        style={{ justifyContent: "space-between", flexWrap: "wrap" }}
      >
        <h1 style={{ margin: 0, fontSize: "1.35rem" }}>
          {t(locale, "editorTitle")}
        </h1>
        <Button variant="copper" onClick={() => onNavigate("sim")}>
          {t(locale, "navSim")} →
        </Button>
      </div>
      <DesignEditorPanel />
    </div>
  );
}
