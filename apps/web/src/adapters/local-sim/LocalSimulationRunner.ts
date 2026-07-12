import type {
  SimulationRunnerPort,
  SimProgressEvent,
  SimRunResultDto,
} from "@orbitlab/application";
import type { RocketDesign } from "@orbitlab/domain";
import {
  createDefaultPipeline,
  DEFAULT_FREE_MODULE_IDS,
  DEFAULT_SIM_CONFIG,
  type RocketDesignSnapshot,
  type ToyVerticalFlightData,
} from "@orbitlab/sim-core";

function numMeta(
  metadata: Readonly<Record<string, unknown>>,
  key: string,
  fallback: number
): number {
  const v = metadata[key];
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

/**
 * Map domain RocketDesign → sim-core snapshot using design metadata.
 * Motor / mass params live in metadata until a richer model lands.
 */
export function designToSnapshot(design: RocketDesign): RocketDesignSnapshot {
  const m = design.metadata;
  return {
    massKg: numMeta(m, "massKg", 0.45),
    thrustN: numMeta(m, "thrustN", 18),
    burnTimeS: numMeta(m, "burnTimeS", 1.2),
    cd: numMeta(m, "cd", 0.5),
    areaM2: numMeta(m, "areaM2", 0.01),
    components: design.components.map((c) => ({
      id: c.id,
      name: c.name,
      massKg:
        typeof c.params.massKg === "number" ? (c.params.massKg as number) : 0,
    })),
  };
}

/**
 * LocalSimulationRunner — SimulationRunnerPort backed by sim-core pipeline.
 * Uses `createDefaultPipeline` (Factory) rather than PocketBase / workers.
 */
export class LocalSimulationRunner implements SimulationRunnerPort {
  private readonly pipeline = createDefaultPipeline();

  async run(
    design: RocketDesign,
    moduleIds: readonly string[],
    onProgress?: (event: SimProgressEvent) => void
  ): Promise<SimRunResultDto> {
    const ids =
      moduleIds.length > 0 ? [...moduleIds] : [...DEFAULT_FREE_MODULE_IDS];

    const snapshot = designToSnapshot(design);
    const total = ids.length;

    const pipelineResult = this.pipeline.run({
      design: snapshot,
      config: { ...DEFAULT_SIM_CONFIG },
      moduleIds: ids,
      onProgress: (e) => {
        if (!onProgress) return;
        if (e.type === "module:start" && e.moduleId) {
          const index = e.index ?? 0;
          onProgress({
            moduleId: e.moduleId,
            fraction: total > 0 ? index / total : 0,
            message: "starting",
          });
        }
        if (e.type === "module:done" && e.moduleId) {
          const index = e.index ?? 0;
          onProgress({
            moduleId: e.moduleId,
            fraction: total > 0 ? (index + 1) / total : 1,
            message: "done",
          });
        }
      },
    });

    const flight = pipelineResult.results.get("flight.toy-vertical");
    const flightData = flight?.data as ToyVerticalFlightData | undefined;

    const samples =
      flightData?.samples.map((s) => ({
        t: s.t,
        altitude: s.altitude,
        velocity: s.velocity,
      })) ?? [];

    // Store full ModuleResult envelope so ExportReport can render equation steps.
    const moduleOutputs: Record<string, unknown> = {};
    for (const [id, result] of pipelineResult.results) {
      moduleOutputs[id] = {
        data: result.data,
        steps: result.steps,
      };
    }

    const summary = {
      apogeeM: flightData?.maxAltitudeM ?? 0,
      maxVelocityMs: flightData?.maxVelocityMs ?? 0,
      flightTimeS: flightData?.flightTimeS ?? 0,
    };

    return {
      id: `local_run_${Date.now().toString(36)}`,
      designId: design.id,
      moduleIds: ids,
      status: "completed",
      summary,
      createdAt: new Date().toISOString(),
      samples,
      moduleOutputs,
    };
  }
}
