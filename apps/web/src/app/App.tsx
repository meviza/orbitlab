import { Layout } from "../shared/ui/Layout";
import { EditorPage } from "../pages/EditorPage";
import { HomePage } from "../pages/HomePage";
import { SimPage } from "../pages/SimPage";
import { useLocale } from "./providers";
import { useHashRouter } from "./router";

export function App() {
  const { route, navigate } = useHashRouter();
  const { locale, toggleLocale } = useLocale();

  return (
    <Layout
      route={route}
      locale={locale}
      onNavigate={navigate}
      onToggleLocale={toggleLocale}
    >
      {route === "home" && <HomePage onNavigate={navigate} />}
      {route === "editor" && <EditorPage onNavigate={navigate} />}
      {route === "sim" && <SimPage />}
    </Layout>
  );
}
