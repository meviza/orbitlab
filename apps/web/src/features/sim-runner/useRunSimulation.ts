import { useCallback, useState } from "react";
import type { SimRunResultDto } from "@orbitlab/application";
import { useContainer } from "../../app/providers";

export function useRunSimulation() {
  const { runSimulation, defaultModuleIds } = useContainer();
  const [result, setResult] = useState<SimRunResultDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(
    async (designId: string, moduleIds?: readonly string[]) => {
      setLoading(true);
      setError(null);
      try {
        const outcome = await runSimulation.execute({
          designId,
          moduleIds: moduleIds ?? defaultModuleIds,
        });
        if (!outcome.ok) {
          setError(outcome.error.message);
          setResult(null);
          return null;
        }
        setResult(outcome.value);
        return outcome.value;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        setError(msg);
        setResult(null);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [runSimulation, defaultModuleIds]
  );

  return { result, loading, error, run, setResult };
}
