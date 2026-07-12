import type { SimRunResultDto } from "./sim-run-dto.js";

export interface ReportDto {
  readonly runId: string;
  readonly designId: string;
  readonly title: string;
  readonly markdown: string;
  readonly csv: string;
  /** Optional HTML preview from the report engine. */
  readonly htmlPreview?: string;
  readonly generatedAt: string;
}

export interface ExportReportCommand {
  readonly run: SimRunResultDto;
  readonly designTitle?: string;
  readonly includeFullSteps?: boolean;
}
