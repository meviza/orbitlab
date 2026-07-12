import {
  DomainError,
  err,
  ok,
  type FileStoragePort,
  type Result,
  type UploadInput,
  type UploadResult,
} from "@orbitlab/domain";

/**
 * Report artifact kinds produced by ExportReportUseCase / `@orbitlab/report`.
 */
export type ReportKind = "md" | "csv" | "html";

/**
 * Logical path convention for sim-run report files:
 *
 * ```
 * sim_runs/${runId}/report.${kind}
 * ```
 *
 * Examples:
 * - `sim_runs/abc123xyz000001/report.md`
 * - `sim_runs/abc123xyz000001/report.csv`
 * - `sim_runs/abc123xyz000001/report.html`
 *
 * ## PocketBase file fields
 *
 * PocketBase stores files on a **collection record field**, not as free-form
 * object keys. {@link PocketBaseFileStorage} therefore interprets
 * `FileStoragePort` paths as `{collection}/{recordId}/{field}`.
 *
 * Suggested schema (not yet in `pb_schema.json` — document for future migration):
 * | kind   | PB field name | MIME              |
 * |--------|---------------|-------------------|
 * | `md`   | `report_md`   | text/markdown     |
 * | `csv`  | `report_csv`  | text/csv          |
 * | `html` | `report_html` | text/html         |
 *
 * `buildReportPath` is the **logical / portable** key used by the app and
 * tests. When uploading through {@link FileStoragePort}, callers may either:
 * 1. Pass the logical path if the adapter maps the third segment to a field, or
 * 2. Use {@link reportFieldName} + manual path `sim_runs/${runId}/${field}`.
 *
 * {@link PocketBaseReportStorage.uploadReport} uses option (2) when a
 * `FileStoragePort` is injected so PB field names stay valid identifiers.
 */

export const REPORT_COLLECTION = "sim_runs" as const;

export const REPORT_CONTENT_TYPES: Readonly<Record<ReportKind, string>> = {
  md: "text/markdown; charset=utf-8",
  csv: "text/csv; charset=utf-8",
  html: "text/html; charset=utf-8",
};

/** PocketBase file field names for each report kind. */
export const REPORT_FIELD_NAMES: Readonly<Record<ReportKind, string>> = {
  md: "report_md",
  csv: "report_csv",
  html: "report_html",
};

const SAFE_RUN_ID = /^[A-Za-z0-9]+$/;
const REPORT_KINDS = new Set<ReportKind>(["md", "csv", "html"]);

/**
 * Reject path traversal / injection: run ids must be alphanumeric only
 * (matches PocketBase default id charset `[a-z0-9]+`, plus uppercase for flexibility).
 */
export function assertSafeRunId(runId: string): Result<string, DomainError> {
  const trimmed = runId?.trim() ?? "";
  if (!trimmed) {
    return err(
      DomainError.validation("runId is required", { runId })
    );
  }
  if (!SAFE_RUN_ID.test(trimmed)) {
    return err(
      DomainError.validation(
        "runId must be alphanumeric (no path separators or special characters)",
        { runId }
      )
    );
  }
  return ok(trimmed);
}

export function isReportKind(value: string): value is ReportKind {
  return REPORT_KINDS.has(value as ReportKind);
}

export function reportFieldName(kind: ReportKind): string {
  return REPORT_FIELD_NAMES[kind];
}

/**
 * Logical portable path: `sim_runs/${runId}/report.${kind}`.
 * Validates `runId` and `kind`.
 */
export function buildReportPath(
  runId: string,
  kind: ReportKind
): Result<string, DomainError> {
  const safe = assertSafeRunId(runId);
  if (!safe.ok) return safe;

  if (!isReportKind(kind)) {
    return err(
      DomainError.validation("kind must be md, csv, or html", { kind })
    );
  }

  return ok(`${REPORT_COLLECTION}/${safe.value}/report.${kind}`);
}

/**
 * Path suitable for {@link PocketBaseFileStorage}:
 * `{collection}/{recordId}/{field}` → e.g. `sim_runs/${runId}/report_md`.
 */
export function buildReportUploadPath(
  runId: string,
  kind: ReportKind
): Result<string, DomainError> {
  const safe = assertSafeRunId(runId);
  if (!safe.ok) return safe;

  if (!isReportKind(kind)) {
    return err(
      DomainError.validation("kind must be md, csv, or html", { kind })
    );
  }

  return ok(
    `${REPORT_COLLECTION}/${safe.value}/${REPORT_FIELD_NAMES[kind]}`
  );
}

/**
 * Helper for sim-run report file paths and optional {@link FileStoragePort} I/O.
 *
 * Pure path helpers work without network. Upload/getUrl require an injected
 * `FileStoragePort` (typically {@link PocketBaseFileStorage}).
 */
export class PocketBaseReportStorage {
  constructor(private readonly files?: FileStoragePort) {}

  assertSafeRunId(runId: string): Result<string, DomainError> {
    return assertSafeRunId(runId);
  }

  buildReportPath(
    runId: string,
    kind: ReportKind
  ): Result<string, DomainError> {
    return buildReportPath(runId, kind);
  }

  buildReportUploadPath(
    runId: string,
    kind: ReportKind
  ): Result<string, DomainError> {
    return buildReportUploadPath(runId, kind);
  }

  /**
   * Upload a report artifact for a sim run via the injected file storage port.
   * Uses PB field path `sim_runs/${runId}/report_{kind}` (see module docs).
   */
  async uploadReport(
    runId: string,
    kind: ReportKind,
    data: Uint8Array | ArrayBuffer,
    options?: { contentType?: string }
  ): Promise<Result<UploadResult, DomainError>> {
    if (!this.files) {
      return err(
        DomainError.validation(
          "FileStoragePort is not configured on PocketBaseReportStorage"
        )
      );
    }

    const pathResult = buildReportUploadPath(runId, kind);
    if (!pathResult.ok) return pathResult;

    const input: UploadInput = {
      path: pathResult.value,
      data,
      contentType: options?.contentType ?? REPORT_CONTENT_TYPES[kind],
    };

    return this.files.upload(input);
  }

  /**
   * Resolve a public/authenticated URL for a stored report via file storage.
   * Uses the same PB field path as {@link uploadReport}.
   */
  async getReportUrl(
    runId: string,
    kind: ReportKind
  ): Promise<Result<string, DomainError>> {
    if (!this.files) {
      return err(
        DomainError.validation(
          "FileStoragePort is not configured on PocketBaseReportStorage"
        )
      );
    }

    const pathResult = buildReportUploadPath(runId, kind);
    if (!pathResult.ok) return pathResult;

    return this.files.getUrl(pathResult.value);
  }
}
