import type { DomainError } from "../shared/errors.js";
import type { Result } from "../shared/result.js";

export interface UploadInput {
  readonly path: string;
  /** Binary payload; adapters may wrap platform Blob/File as needed. */
  readonly data: Uint8Array | ArrayBuffer;
  readonly contentType?: string;
}

export interface UploadResult {
  readonly path: string;
  readonly url: string;
}

export interface FileStoragePort {
  upload(input: UploadInput): Promise<Result<UploadResult, DomainError>>;
  getUrl(path: string): Promise<Result<string, DomainError>>;
}
