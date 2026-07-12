import { useCallback, useEffect, useState } from "react";

export type RouteId = "home" | "editor" | "sim";

const VALID: RouteId[] = ["home", "editor", "sim"];

function parseHash(hash: string): RouteId {
  const raw = hash.replace(/^#\/?/, "").split("?")[0] ?? "";
  if (VALID.includes(raw as RouteId)) {
    return raw as RouteId;
  }
  return "home";
}

export function useHashRouter() {
  const [route, setRouteState] = useState<RouteId>(() =>
    typeof window !== "undefined" ? parseHash(window.location.hash) : "home"
  );

  useEffect(() => {
    const onHash = () => setRouteState(parseHash(window.location.hash));
    window.addEventListener("hashchange", onHash);
    if (!window.location.hash) {
      window.location.hash = "#/home";
    }
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const navigate = useCallback((next: RouteId) => {
    window.location.hash = `#/${next}`;
    setRouteState(next);
  }, []);

  return { route, navigate };
}
