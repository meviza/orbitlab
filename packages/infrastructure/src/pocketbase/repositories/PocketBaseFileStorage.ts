import {
  DomainError,
  err,
  ok,
  type FileStoragePort,
  type Result,
  type UploadInput,
  type UploadResult,
} from "@orbitlab/domain";
import type { PbLike, PbRecord } from "../../types/pb-like.js";

/**
 * PocketBase file field adapter implementing domain {@link FileStoragePort}.
 *
 * `path` format: `{collection}/{recordId}/{field}` — filename derived from upload.
 */
export class PocketBaseFileStorage implements FileStoragePort {
  constructor(private readonly pb: PbLike) {}

  async upload(
    input: UploadInput
  ): Promise<Result<UploadResult, DomainError>> {
    try {
      const parsed = parsePath(input.path);
      if (!parsed) {
        return err(
          DomainError.validation(
            "path must be collection/recordId/field"
          )
        );
      }

      const buffer =
        input.data instanceof ArrayBuffer
          ? input.data
          : input.data.buffer.slice(
              input.data.byteOffset,
              input.data.byteOffset + input.data.byteLength
            );
      const blob = new Blob([buffer as ArrayBuffer], {
        type: input.contentType ?? "application/octet-stream",
      });
      const filename = `file-${Date.now()}.bin`;
      const form = new FormData();
      form.append(parsed.field, blob, filename);

      const record = (await this.pb
        .collection(parsed.collection)
        .update(
          parsed.recordId,
          form as unknown as Record<string, unknown>
        )) as PbRecord;

      const storedName = resolveFilename(record[parsed.field], filename);
      const url = this.pb.files.getUrl(
        {
          id: parsed.recordId,
          collectionName: parsed.collection,
        },
        storedName
      );

      return ok({
        path: `${parsed.collection}/${parsed.recordId}/${storedName}`,
        url,
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Upload failed";
      return err(DomainError.validation(message));
    }
  }

  async getUrl(path: string): Promise<Result<string, DomainError>> {
    try {
      const parts = path.split("/");
      if (parts.length < 3) {
        return err(DomainError.validation("Invalid file path"));
      }
      const [collection, recordId, ...rest] = parts;
      const filename = rest.join("/");
      if (!collection || !recordId || !filename) {
        return err(DomainError.validation("Invalid file path"));
      }
      const url = this.pb.files.getUrl(
        { id: recordId, collectionName: collection },
        filename
      );
      return ok(url);
    } catch (e) {
      const message = e instanceof Error ? e.message : "getUrl failed";
      return err(DomainError.validation(message));
    }
  }
}

function parsePath(
  path: string
): { collection: string; recordId: string; field: string } | null {
  const parts = path.split("/").filter(Boolean);
  if (parts.length !== 3) return null;
  const [collection, recordId, field] = parts;
  if (!collection || !recordId || !field) return null;
  return { collection, recordId, field };
}

function resolveFilename(fieldValue: unknown, fallback: string): string {
  if (typeof fieldValue === "string" && fieldValue.length > 0) {
    return fieldValue;
  }
  if (Array.isArray(fieldValue) && typeof fieldValue[0] === "string") {
    return fieldValue[0];
  }
  return fallback;
}
