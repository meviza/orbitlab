import { DomainError } from "../shared/errors.js";
import {
  calcModuleId,
  type CalcModuleId,
} from "../value-objects/calc-module-id.js";

export type SimRunStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "cancelled";

export interface SimSummaryMetrics {
  readonly apogeeM?: number;
  readonly maxVelocityMs?: number;
  readonly maxAccelerationMs2?: number;
  readonly flightTimeS?: number;
  readonly [key: string]: number | undefined;
}

export interface SimRunProps {
  readonly id: string;
  readonly designId: string;
  readonly moduleIds: readonly CalcModuleId[];
  readonly status: SimRunStatus;
  readonly summary: SimSummaryMetrics;
  readonly createdAt: Date;
  readonly errorMessage?: string;
}

export interface CreateSimRunInput {
  readonly id: string;
  readonly designId: string;
  readonly moduleIds: readonly string[];
  readonly status?: SimRunStatus;
  readonly summary?: SimSummaryMetrics;
  readonly createdAt: Date;
  readonly errorMessage?: string;
}

const TERMINAL: ReadonlySet<SimRunStatus> = new Set([
  "completed",
  "failed",
  "cancelled",
]);

export class SimRun {
  readonly id: string;
  readonly designId: string;
  readonly moduleIds: readonly CalcModuleId[];
  readonly status: SimRunStatus;
  readonly summary: SimSummaryMetrics;
  readonly createdAt: Date;
  readonly errorMessage?: string;

  private constructor(props: SimRunProps) {
    this.id = props.id;
    this.designId = props.designId;
    this.moduleIds = Object.freeze([...props.moduleIds]);
    this.status = props.status;
    this.summary = Object.freeze({ ...props.summary });
    this.createdAt = props.createdAt;
    this.errorMessage = props.errorMessage;
  }

  static create(input: CreateSimRunInput): SimRun {
    if (!input.id?.trim()) {
      throw DomainError.validation("SimRun id is required");
    }
    if (!input.designId?.trim()) {
      throw DomainError.validation("SimRun designId is required");
    }
    if (!input.moduleIds?.length) {
      throw DomainError.validation(
        "SimRun requires at least one module id"
      );
    }
    if (!(input.createdAt instanceof Date) || Number.isNaN(input.createdAt.getTime())) {
      throw DomainError.validation("SimRun createdAt must be a valid Date");
    }

    let moduleIds: CalcModuleId[];
    try {
      moduleIds = input.moduleIds.map((id) => calcModuleId(id));
    } catch (e) {
      throw DomainError.validation(
        e instanceof Error ? e.message : "Invalid module id"
      );
    }

    const status = input.status ?? "pending";

    return new SimRun({
      id: input.id.trim(),
      designId: input.designId.trim(),
      moduleIds,
      status,
      summary: input.summary ?? {},
      createdAt: input.createdAt,
      errorMessage: input.errorMessage,
    });
  }

  markRunning(): SimRun {
    this.assertTransition("running");
    return this.withStatus("running");
  }

  markCompleted(summary: SimSummaryMetrics): SimRun {
    this.assertTransition("completed");
    return new SimRun({
      id: this.id,
      designId: this.designId,
      moduleIds: this.moduleIds,
      status: "completed",
      summary,
      createdAt: this.createdAt,
    });
  }

  markFailed(errorMessage: string): SimRun {
    this.assertTransition("failed");
    return new SimRun({
      id: this.id,
      designId: this.designId,
      moduleIds: this.moduleIds,
      status: "failed",
      summary: this.summary,
      createdAt: this.createdAt,
      errorMessage: errorMessage.trim() || "Simulation failed",
    });
  }

  isTerminal(): boolean {
    return TERMINAL.has(this.status);
  }

  private withStatus(status: SimRunStatus): SimRun {
    return new SimRun({
      id: this.id,
      designId: this.designId,
      moduleIds: this.moduleIds,
      status,
      summary: this.summary,
      createdAt: this.createdAt,
      errorMessage: this.errorMessage,
    });
  }

  private assertTransition(next: SimRunStatus): void {
    if (this.isTerminal()) {
      throw DomainError.validation(
        `Cannot transition SimRun from terminal status "${this.status}" to "${next}"`
      );
    }
  }
}
