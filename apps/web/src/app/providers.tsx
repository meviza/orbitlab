import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Locale } from "../shared/i18n/messages";
import { container, type AppContainer } from "./di";

const ContainerContext = createContext<AppContainer>(container);

export interface LocaleContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  toggleLocale: () => void;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function AppProviders({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>("en");

  const localeValue = useMemo<LocaleContextValue>(
    () => ({
      locale,
      setLocale,
      toggleLocale: () => setLocale((l) => (l === "en" ? "tr" : "en")),
    }),
    [locale]
  );

  return (
    <ContainerContext.Provider value={container}>
      <LocaleContext.Provider value={localeValue}>
        {children}
      </LocaleContext.Provider>
    </ContainerContext.Provider>
  );
}

export function useContainer(): AppContainer {
  return useContext(ContainerContext);
}

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    throw new Error("useLocale must be used within AppProviders");
  }
  return ctx;
}
