import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Locale } from "../shared/i18n/messages";
import { StatusBanner } from "../shared/ui/StatusBanner";
import { createContainer, type AppContainer } from "./di";

const ContainerContext = createContext<AppContainer | null>(null);

export interface LocaleContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  toggleLocale: () => void;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function AppProviders({ children }: { children: ReactNode }) {
  const [container, setContainer] = useState<AppContainer | null>(null);
  const [bootError, setBootError] = useState<string | null>(null);
  const [locale, setLocale] = useState<Locale>("en");

  useEffect(() => {
    let cancelled = false;

    void createContainer()
      .then((c) => {
        if (!cancelled) {
          setContainer(c);
          setBootError(null);
        }
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          const message =
            e instanceof Error
              ? e.message
              : "Unknown error while creating the app container.";
          setBootError(message);
          setContainer(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const localeValue = useMemo<LocaleContextValue>(
    () => ({
      locale,
      setLocale,
      toggleLocale: () => setLocale((l) => (l === "en" ? "tr" : "en")),
    }),
    [locale]
  );

  if (bootError) {
    return (
      <StatusBanner
        variant="error"
        title="OrbitLab failed to start"
        message={
          bootError +
          "\n\nTip: set VITE_DATA_BACKEND=memory in apps/web/.env to run offline without PocketBase."
        }
      />
    );
  }

  if (!container) {
    return (
      <StatusBanner
        variant="loading"
        title="Starting OrbitLab…"
        message="Wiring composition root."
      />
    );
  }

  if (!container.health.ok) {
    return (
      <StatusBanner
        variant="error"
        title="Backend unhealthy"
        message={
          container.health.message ??
          "The data backend reported a failed health check."
        }
      />
    );
  }

  return (
    <ContainerContext.Provider value={container}>
      <LocaleContext.Provider value={localeValue}>
        {children}
      </LocaleContext.Provider>
    </ContainerContext.Provider>
  );
}

export function useContainer(): AppContainer {
  const ctx = useContext(ContainerContext);
  if (!ctx) {
    throw new Error("useContainer must be used within AppProviders");
  }
  return ctx;
}

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    throw new Error("useLocale must be used within AppProviders");
  }
  return ctx;
}
