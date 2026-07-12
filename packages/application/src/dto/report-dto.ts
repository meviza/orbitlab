import type { SimRunResultDto } from "./sim-run-dto.js";

export interface ReportDto {
  readonly runId: string;
  readonly designId: string;
  readonly title: string;
  readonly markdown: string;
  readonly csv: string;
  readonly generatedAt: string;
}

export interface ExportReportCommand {
  readonly run: SimRunResultDto;
  readonly designTitle?: string;
  readonly includeFullSteps?: boolean;
}
