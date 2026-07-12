/** One exam-style equation step (mirrors sim-core EquationStep). */
export interface ReportStep {
  readonly title: string;
  readonly latex?: string;
  readonly prose: string;
}

/** Per-module trace consumed by the report engine. */
export interface ReportModuleResult {
  readonly moduleId: string;
  /** Optional display title; defaults to moduleId. */
  readonly title?: string;
  readonly steps: readonly ReportStep[];
  /** Optional raw module data for JSON appendix when steps are empty. */
  readonly data?: unknown;
}

/** Input to `buildReport`. */
export interface BuildReportInput {
  readonly designTitle: string;
  readonly runId?: string;
  readonly designId?: string;
  readonly status?: string;
  readonly moduleIds?: readonly string[];
  readonly createdAt?: string;
  readonly errorMessage?: string;
  /** When true (default), include equation steps per module. */
  readonly includeFullSteps?: boolean;
  readonly moduleResults?: readonly ReportModuleResult[];
  readonly samples?: ReadonlyArray<Readonly<Record<string, number>>>;
  readonly summary?: Readonly<Record<string, number | undefined | null>>;
}

/** Output of `buildReport`. */
export interface BuildReportOutput {
  readonly markdown: string;
  readonly csv: string;
  /**
   * Standalone HTML document (print/PDF friendly).
   * Includes CDN KaTeX when the report has LaTeX steps.
   * Suitable for blob download as `.html` or window.print().
   */
  readonly htmlPreview?: string;
}
