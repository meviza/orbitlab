import type { SimRun, SimRunStatus, SimSummaryMetrics } from "@orbitlab/domain";

export interface SimProgressEvent {
  readonly moduleId: string;
  readonly fraction: number;
  readonly message?: string;
}

export interface SimRunResultDto {
  readonly id: string;
  readonly designId: string;
  readonly moduleIds: readonly string[];
  readonly status: SimRunStatus;
  readonly summary: SimSummaryMetrics;
  readonly createdAt: string;
  readonly errorMessage?: string;
  /** Optional time-series or module outputs for charts / reports. */
  readonly samples?: ReadonlyArray<Readonly<Record<string, number>>>;
  readonly moduleOutputs?: Readonly<Record<string, unknown>>;
}

export interface RunSimulationCommand {
  readonly designId: string;
  readonly moduleIds: readonly string[];
}

export function simRunToDto(
  run: SimRun,
  extras?: {
    samples?: ReadonlyArray<Readonly<Record<string, number>>>;
    moduleOutputs?: Readonly<Record<string, unknown>>;
  }
): SimRunResultDto {
  return {
    id: run.id,
    designId: run.designId,
    moduleIds: [...run.moduleIds],
    status: run.status,
    summary: { ...run.summary },
    createdAt: run.createdAt.toISOString(),
    errorMessage: run.errorMessage,
    samples: extras?.samples,
    moduleOutputs: extras?.moduleOutputs,
  };
}
