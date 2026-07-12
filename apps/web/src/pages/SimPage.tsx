import { useLocale } from "../app/providers";
import { SimRunnerPanel } from "../features/sim-runner/SimRunnerPanel";
import { t } from "../shared/i18n/messages";

export function SimPage() {
  const { locale } = useLocale();

  return (
    <div className="stack" style={{ gap: "1rem" }}>
      <h1 style={{ margin: 0, fontSize: "1.35rem" }}>{t(locale, "simTitle")}</h1>
      <SimRunnerPanel />
    </div>
  );
}
